exports.asBuffer = function (data) {
  return Buffer.from(JSON.stringify(data));
};

exports.resultMessage = function (taskId, status) {
  return {
    taskId: taskId,
    eventType: status,
    eventData: {
      href: 'https:' + exports.pataviSelf + '/task/' + taskId + '/results'
    }
  };
};

exports.tokenAuth = function (request, response, next) {
  const authHeader = request.get('Authorization');
  if (authHeader && authHeader === process.env.PATAVI_AUTHORISED_TOKEN) {
    next();
  } else {
    response.status(401).send('Unauthorized');
  }
};
