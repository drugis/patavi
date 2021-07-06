'use strict';

var async = require('async');
var format = require('biguint-format');

var config = {
  user: process.env.PATAVI_DB_USER,
  database: process.env.PATAVI_DB_NAME,
  password: process.env.PATAVI_DB_PASSWORD,
  host: process.env.PATAVI_DB_HOST
};

var db = require('./dbUtils')(config);

var flakeIdAsInt64 = function (flakeId) {
  return Buffer.from(flakeId, 'hex');
};

var persistTask = function (
  id,
  creator_name,
  creator_fingerprint,
  service,
  task,
  ttl,
  callback
) {
  db.query(
    'INSERT INTO patavi_task(id, creator_name, creator_fingerprint, service, task, time_to_live) VALUES ($1, $2, $3, $4, $5, $6)',
    [flakeIdAsInt64(id), creator_name, creator_fingerprint, service, task, ttl],
    callback
  );
};

var deleteTask = function (id, callback) {
  db.query(
    'DELETE FROM patavi_task WHERE id = $1',
    [flakeIdAsInt64(id)],
    callback
  );
};

var persistResult = function (id, status, result, callback) {
  var idBuffer = flakeIdAsInt64(id);

  function resultsTransaction(client, callback) {
    function saveIndex(callback) {
      db.query(
        'UPDATE patavi_task SET status = $2, result = $3, updated_at = NOW() WHERE id = $1',
        [idBuffer, status, result.index],
        callback
      );
    }

    function saveFile(file, callback) {
      db.query(
        'INSERT INTO patavi_file (task_id, path, content_type, content) VALUES ($1, $2, $3, $4)',
        [idBuffer, file.path, file.content_type, file.content],
        callback
      );
    }

    function saveFiles(callback) {
      async.each(result.files, saveFile, callback);
    }
    async.parallel([saveIndex, saveFiles], callback);
  }

  db.runInTransaction(resultsTransaction, callback);
};

function saveScript(id, script, callback) {
  var query =
    'UPDATE patavi_task SET script = $2, updated_at = NOW() WHERE id = $1';
  db.query(query, [flakeIdAsInt64(id), script], callback);
}

function singlePropertyCallbackFactory(property, callback) {
  return function (err, result) {
    if (err) {
      callback(err);
    } else if (result.rows.length === 1 && result.rows[0][property]) {
      callback(null, result.rows[0][property]);
    } else {
      var error = new Error('Not found');
      error.status = 404;
      callback(error);
    }
  };
}

function singleResultCallbackFactory(callback) {
  return function (err, result) {
    if (err) {
      callback(err);
    } else if (result.rows.length === 1) {
      callback(null, result.rows[0]);
    } else {
      var error = new Error('Not found');
      error.status = 404;
      callback(error);
    }
  };
}

var getResult = function (id, callback) {
  db.query(
    'SELECT result FROM patavi_task WHERE id = $1',
    [flakeIdAsInt64(id)],
    singlePropertyCallbackFactory('result', callback)
  );
};

var getTask = function (id, callback) {
  db.query(
    'SELECT task FROM patavi_task WHERE id = $1',
    [flakeIdAsInt64(id)],
    singlePropertyCallbackFactory('task', callback)
  );
};

function getScript(id, callback) {
  db.query(
    'SELECT script FROM patavi_task WHERE id = $1',
    [flakeIdAsInt64(id)],
    singlePropertyCallbackFactory('script', callback)
  );
}

var getFile = function (id, fileName, callback) {
  db.query(
    'SELECT content_type, content FROM patavi_file WHERE task_id = $1 AND path = $2',
    [flakeIdAsInt64(id), fileName],
    singleResultCallbackFactory(callback)
  );
};

var getInfo = function (id, callback) {
  db.query(
    'SELECT service, status FROM patavi_task WHERE id = $1',
    [flakeIdAsInt64(id)],
    singleResultCallbackFactory(callback)
  );
};

var getMultiInfo = function (ids, callback) {
  ids = ids.map(function (id) {
    return format(flakeIdAsInt64(id), 'dec');
  });
  db.query(
    'SELECT to_hex(id) AS id, service, status FROM patavi_task WHERE id = ANY($1::BIGINT[])',
    [ids],
    function (err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, result.rows);
      }
    }
  );
};

module.exports = {
  persistTask: persistTask,
  deleteTask: deleteTask,
  persistResult: persistResult,
  getResult: getResult,
  getTask: getTask,
  getFile: getFile,
  getInfo: getInfo,
  saveScript: saveScript,
  getScript: getScript,
  getMultiInfo: getMultiInfo
};
