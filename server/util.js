exports.asBuffer = function (data) {
  return Buffer.from(JSON.stringify(data));
};

exports.pataviSelf = process.env.PATAVI_SELF;

exports.resultMessage = function (taskId, status) {
  return {
    taskId: taskId,
    eventType: status,
    eventData: {
      href: 'https:' + exports.pataviSelf + '/task/' + taskId + '/results'
    }
  };
};
