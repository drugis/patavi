'use strict';
var util = require('./util.js');
var stream = require('stream');
var Busboy = require('busboy');

function parseMultipart(content, contentType, callback) {
  try {
    var busboy = new Busboy({headers: {'content-type': contentType}});

    var index = {};
    var files = [];

    busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
      var content = Buffer.alloc(0);
      file.on('data', function (data) {
        content = Buffer.concat([content, data]);
      });
      file.on('end', function () {
        if (fieldname === 'index') {
          try {
            index = JSON.parse(content.toString());
          } catch (e) {
            callback('error parsing model: ' + content.toString());
          }
        } else {
          files.push({
            path: filename,
            content_type: mimetype,
            content: content
          });
        }
      });
    });

    busboy.on('finish', function () {
      callback(null, {index: index, files: files});
    });

    var bufferStream = new stream.PassThrough();
    bufferStream.end(content);
    bufferStream.pipe(busboy);
  } catch (err) {
    console.log('Ignoring error', err);
  }
}

function parseMessage(content, contentType, callback) {
  var mp = 'multipart/form-data';
  if (contentType && contentType === 'application/json') {
    try {
      var parsed = JSON.parse(content.toString());
      callback(null, {index: parsed, files: []});
    } catch (err) {
      callback('error parsing model: ' + content.toString());
    }
  } else if (contentType && contentType.startsWith(mp)) {
    parseMultipart(content, contentType, callback);
  } else {
    callback('Unrecognized content-type: ' + contentType);
  }
}

module.exports = function (conn, queueName, statusExchange, pataviStore) {
  conn.createChannel(function (err, ch) {
    if (err) {
      console.error(JSON.stringify(err));
      process.exit(1);
    }

    function persist(msg) {
      var taskId = msg.properties.correlationId;
      parseMessage(
        msg.content,
        msg.properties.contentType,
        function (err, result) {
          if (err) {
            console.log(JSON.stringify(err, null, 2));
            ch.ack(msg); // FIXME
            return;
          }
          if (result.index.script) {
            pataviStore.saveScript(taskId, result.index.script, function (err) {
              if (err) {
                // TODO: handle DB errors
                return console.log(JSON.stringify(err, null, 2));
              }
              ch.ack(msg);
            });
          } else {
            var taskStatus =
              result.index.status === 'failed' ? 'failed' : 'done';
            pataviStore.persistResult(
              taskId,
              taskStatus,
              result,
              function (err) {
                if (err) {
                  // TODO: handle DB errors
                  console.log(JSON.stringify(err, null, 2));
                }
                ch.publish(
                  statusExchange,
                  taskId + '.end',
                  util.asBuffer(util.resultMessage(taskId, taskStatus))
                );
                ch.ack(msg);
              }
            );
          }
        }
      );
    }

    ch.prefetch(1);

    ch.assertExchange(statusExchange, 'topic', {durable: false});

    ch.assertQueue(
      queueName,
      {exclusive: false, durable: true},
      function (err) {
        if (err) {
          console.log(JSON.stringify(err, null, 2));
          process.exit(1);
        }

        ch.consume(queueName, persist, {noAck: false}, function (err) {
          if (err) {
            console.log(JSON.stringify(err, null, 2));
            process.exit(1);
          }
        });
      }
    );
  });
};
