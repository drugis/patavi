const API_KEY_HEADER = 'x-api-key';
const CREATOR_HEADER = 'x-client-name';
const proxyHost = process.env.PATAVI_PROXY_HOST;
const pataviSelf = proxyHost
  ? proxyHost
  : process.env.PATAVI_HOST +
    (process.env.PATAVI_PORT ? ':' + process.env.PATAVI_PORT : '');
const isSecure = process.env.SECURE_TRAFFIC === 'true';

exports.API_KEY_HEADER = API_KEY_HEADER;
exports.CREATOR_HEADER = CREATOR_HEADER;
exports.pataviSelf = pataviSelf;
exports.isSecure = isSecure;

exports.asBuffer = function (data) {
  return Buffer.from(JSON.stringify(data));
};

function getHttpBase() {
  return (isSecure ? 'https' : 'http') + '://' + pataviSelf;
}
exports.getHttpBase = getHttpBase;

function getWsBase() {
  return (isSecure ? 'wss' : 'ws') + '://' + pataviSelf;
}
exports.getWsBase = getWsBase;

exports.resultMessage = function (taskId, status) {
  return {
    taskId: taskId,
    eventType: status,
    eventData: {
      href: getHttpBase() + '/task/' + taskId + '/results'
    }
  };
};

exports.tokenAuth = function (request, response, next) {
  const authHeader = request.get(API_KEY_HEADER);
  if (authHeader && authHeader === process.env.PATAVI_API_KEY) {
    next();
  } else {
    next({status: 401});
  }
};
