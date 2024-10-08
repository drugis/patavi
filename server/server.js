'use strict';
const express = require('express');
const cors = require('cors');
const http = require('http');
const {json} = require('body-parser');
const amqp = require('amqplib/callback_api');
const util = require('./util.js');
const pataviStore = require('./pataviStore');
const async = require('async');
const persistenceService = require('./persistenceService');
const logger = require('./logger');
const _ = require('lodash');
const httpStatusCodes = require('http-status-codes');

const config = {
  user: process.env.PATAVI_DB_USER,
  database: process.env.PATAVI_DB_NAME,
  password: process.env.PATAVI_DB_PASSWORD,
  host: process.env.PATAVI_DB_HOST
};
const db = require('./dbUtils')(config);

const StartupDiagnostics = require('startup-diagnostics')(db, logger, 'Patavi');

const FlakeId = require('flake-idgen');
const idGen = new FlakeId(); // FIXME: set unique generator ID

const isValidTaskId = function (id) {
  return /[0-9a-f]{16}/.test(id);
};

const badRequestError = function () {
  const error = new Error('Bad request');
  error.status = httpStatusCodes.StatusCodes.BAD_REQUEST;
  return error;
};

const app = express();

function runDiagnostics(numberOftries) {
  StartupDiagnostics.runStartupDiagnostics((errorBody) => {
    if (numberOftries <= 0) {
      process.exit(1);
    } else if (errorBody) {
      setTimeout(_.partial(runDiagnostics, numberOftries - 1), 10000);
    } else {
      initApp();
    }
  });
}

runDiagnostics(6);

function initApp() {
  const corsOptions = {
    origin: true,
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Credentials',
    optionsSuccessStatus: httpStatusCodes.StatusCodes.OK,
    credentials: true
  };

  app.options('*', cors(corsOptions));
  app.use(cors(corsOptions));
  app.use(json({limit: '5mb'}));

  const server = http.createServer(app);

  // Patavi dashboard
  app.get('/', util.tokenAuth);
  app.get('/index.html', util.tokenAuth);
  app.use('/', express.static(__dirname + '/public'));

  require('express-ws')(app, server);

  const taskDescription = function (taskId, service, status) {
    const description = {
      id: taskId,
      service: service,
      status: status,
      _links: {
        self: {href: util.getHttpBase() + '/task/' + taskId},
        updates: {href: util.getWsBase() + '/task/' + taskId + '/updates'},
        task: {href: util.getHttpBase() + '/task/' + taskId + '/task'}
      }
    };
    if (status === 'failed' || status === 'done') {
      description._links.results = {
        href: util.getHttpBase() + '/task/' + taskId + '/results'
      };
    }
    return description;
  };

  const updatesWebSocket = function (ch, statusExchange) {
    function makeEventQueue(taskId, callback) {
      ch.assertQueue(
        '',
        {exclusive: true, autoDelete: true},
        function (err, statusQ) {
          if (!err) {
            ch.bindQueue(statusQ.queue, statusExchange, taskId + '.*');
          }
          callback(err, statusQ);
        }
      );
    }

    function wsSendErrorHandler(error) {
      if (error) {
        logger.info('Error sending on WebSocket: ', error);
      }
    }
    return function (ws, req) {
      function receiveMessage(msg) {
        var str = msg.content.toString();
        var json = JSON.parse(str);
        ws.send(str, wsSendErrorHandler);
        if (json.eventType === 'done' || json.eventType === 'failed') {
          ws.close();
        }
      }

      function consumerStarted(taskId) {
        return function (err, ok) {
          ws.on('close', function () {
            // stop listening when the client leaves
            if (ok && ok.consumerTag) {
              ch.cancel(ok.consumerTag);
            }
          });
          pataviStore.getInfo(taskId, function (err, info) {
            if (err) {
              ws.close();
            } else if (info.status === 'failed' || info.status === 'done') {
              ws.send(
                JSON.stringify(util.resultMessage(taskId, info.status)),
                wsSendErrorHandler
              );
              ws.close();
            }
          });
        };
      }

      var taskId = req.params.taskId;
      if (!isValidTaskId(taskId)) {
        return ws.close();
      }
      makeEventQueue(taskId, function (err, statusQ) {
        if (err) {
          logger.error('Error creating websocket', err);
          return ws.close();
        }

        ch.consume(
          statusQ.queue,
          receiveMessage,
          {noAck: true},
          consumerStarted(taskId)
        );
      });
    };
  };

  var postTask = function (ch, _statusExchange, replyTo) {
    return function (req, res, next) {
      var service = req.query.service;
      var ttl = req.query.ttl ? req.query.ttl : null;
      var taskId = idGen.next().toString('hex');
      const authHeader = req.get(util.API_KEY_HEADER);
      const creatorName = req.get(util.CREATOR_HEADER);

      function persistTask(callback) {
        pataviStore.persistTask(
          taskId,
          creatorName,
          authHeader,
          service,
          req.body,
          ttl,
          function (err) {
            callback(err);
          }
        );
      }

      function assertServiceQueue(callback) {
        ch.assertQueue(service, {exclusive: false, durable: true}, callback);
      }

      function queueTask(q) {
        ch.sendToQueue(service, Buffer.from(JSON.stringify(req.body)), {
          correlationId: taskId,
          replyTo: replyTo
        });

        res.status(httpStatusCodes.StatusCodes.CREATED);
        res.location(util.getHttpBase() + '/task/' + taskId);
        var status = q.consumerCount === 0 ? 'no-workers' : 'unknown';
        res.send(taskDescription(taskId, service, status));
      }

      async.waterfall(
        [persistTask, assertServiceQueue, queueTask],
        function (err) {
          next(err);
        }
      );
    };
  };

  // API routes that depend on AMQP connection
  amqp.connect(
    'amqp://' + process.env.PATAVI_BROKER_HOST,
    function (err, conn) {
      if (err) {
        logger.error(err);
        process.exit(1);
      }
      conn.createChannel(function (err, ch) {
        if (err) {
          logger.error(err);
          process.exit(1);
        }

        var statusExchange = 'rpc_status';
        ch.assertExchange(statusExchange, 'topic', {durable: false});

        var replyTo = 'rpc_result';
        ch.assertQueue(replyTo, {exclusive: false, durable: true}, (err) => {
          if (err) {
            logger.info(err);
            process.exit(1);
          }

          persistenceService(conn, replyTo, statusExchange, pataviStore);

          app.ws('/task/:taskId/updates', updatesWebSocket(ch, statusExchange));

          app.post(
            '/task',
            util.tokenAuth,
            postTask(ch, statusExchange, replyTo)
          );
        });
      });
    }
  );

  // API routes that do not depend on AMQP connection

  app.get('/task/:taskId', function (req, res, next) {
    var taskId = req.params.taskId;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    pataviStore.getInfo(taskId, function (err, info) {
      if (err) {
        return next(err);
      }
      if (info.status === 'done' || info.status === 'failed') {
        res.header('Cache-Control', 'public, max-age=31557600'); // completed tasks never change
      }
      var taskInfo = taskDescription(taskId, info.service, info.status);
      pataviStore.getScript(taskId, function (err) {
        if (!err) {
          taskInfo._links.script = {
            href: util.getHttpBase() + '/task/' + taskId + '/script'
          };
        }
        res.send(taskInfo);
      });
    });
  });

  app.get('/status', function (req, res, next) {
    var tasks = req.query.task;
    if (typeof tasks === 'string') {
      tasks = [tasks];
    }
    if (!tasks.every(isValidTaskId)) {
      return next(badRequestError());
    }
    pataviStore.getMultiInfo(tasks, function (err, info) {
      if (err) {
        return next(err);
      }
      res.send(
        info.map(function (item) {
          return taskDescription(item.id, item.service, item.status);
        })
      );
    });
  });

  app.get('/task/:taskId/task', function (req, res, next) {
    var taskId = req.params.taskId;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    if (req.headers['if-modified-since'] || req.headers['if-none-match']) {
      // task never changes
      res.status(httpStatusCodes.StatusCodes.NOT_MODIFIED);
      res.end();
      return;
    }
    pataviStore.getTask(taskId, function (err, result) {
      if (err) {
        return next(err);
      }
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'public, max-age=31557600'); // task never changes
      res.send(result);
    });
  });

  app.get('/task/:taskId/script', function (req, res, next) {
    var taskId = req.params.taskId;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    if (req.headers['if-modified-since'] || req.headers['if-none-match']) {
      // task never changes
      res.status(httpStatusCodes.StatusCodes.NOT_MODIFIED);
      res.end();
      return;
    }
    pataviStore.getScript(taskId, function (err, result) {
      if (err) {
        return next(err);
      }
      res.header('Content-Type', 'text/plain');
      res.header('Cache-Control', 'public, max-age=31557600'); // task never changes
      res.send(unescape(result));
    });
  });

  app.get('/task/:taskId/results', function (req, res, next) {
    var taskId = req.params.taskId;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    if (req.headers['if-modified-since'] || req.headers['if-none-match']) {
      // results never change
      res.status(httpStatusCodes.StatusCodes.NOT_MODIFIED);
      res.end();
      return;
    }
    pataviStore.getResult(taskId, function (err, result) {
      if (err) {
        return next(err);
      }
      res.header('Content-Type', 'application/json');
      res.header('Cache-Control', 'public, max-age=31557600'); // results never change
      res.send(result);
    });
  });

  app.get('/task/:taskId/results/:file', function (req, res, next) {
    var taskId = req.params.taskId;
    var fileName = req.params.file;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    if (req.headers['if-modified-since'] || req.headers['if-none-match']) {
      // results never change
      res.status(httpStatusCodes.StatusCodes.NOT_MODIFIED);
      res.end();
      return;
    }
    pataviStore.getFile(taskId, fileName, function (err, file) {
      if (err) {
        return next(err);
      }
      res.header('Content-Type', file.content_type);
      res.header('Cache-Control', 'public, max-age=31557600'); // results never change
      res.send(file.content);
    });
  });

  app.delete('/task/:taskId', util.tokenAuth, function (req, res, next) {
    var taskId = req.params.taskId;
    if (!isValidTaskId(taskId)) {
      return next(badRequestError());
    }
    pataviStore.deleteTask(taskId, function (err) {
      if (err) {
        return next(err);
      }
      res.status(httpStatusCodes.StatusCodes.OK);
      res.end();
    });
  });

  // Render 401 Not Authorized error
  app.use(function (err, req, res, next) {
    if (err.status !== httpStatusCodes.StatusCodes.UNAUTHORIZED) {
      return next(err);
    }

    res
      .status(httpStatusCodes.StatusCodes.UNAUTHORIZED)
      .sendFile('error401.html', {root: __dirname});
  });

  server.listen(process.env.PATAVI_PORT, function () {
    logger.info('Listening on ' + util.getHttpBase());
  });
}
