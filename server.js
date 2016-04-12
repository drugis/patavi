var amqp = require('amqplib/callback_api');
var util = require('./util');
var async = require('async');

var FlakeId = require('flake-idgen');
var idGen = new FlakeId(); // FIXME: set unique generator ID

var workerId = idGen.next().toString('hex');

amqp.connect('amqp://' + process.env.PATAVI_BROKER_HOST, function(err, conn) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  conn.createChannel(function(err, ch) {
    var q = 'rpc_queue';
    var ex = 'rpc_status';

    ch.assertQueue(q, {durable: false}); // should durable be true?
    ch.prefetch(1); // fair dispatch

    ch.assertExchange(ex, 'topic', { durable: false });

    console.log(' [x] Awaiting RPC requests');
    ch.consume(q, function reply(msg) {
      var secs = parseInt(msg.content.toString());
      var taskId = msg.properties.correlationId;

      // Send events of the form
      // { event: 'task_accepted', workerId: workerId, taskId: taskId }
      // To a 'monitoring' exchange, topic $taskId.status. Do this for:
      //  - Task accepted
      //  - Task completed
      //  - Task failed
      //  - Progress (optional)

      ch.publish(ex, taskId + ".status", util.asBuffer({ taskId: taskId, eventType: "accepted", workerId: workerId }));
      async.timesSeries(secs, function(i, next) {
        setTimeout(function() {
          console.log(" [ ] " + i);
          ch.publish(ex, taskId + ".status", util.asBuffer({ taskId: taskId, eventType: "progress", eventData: (i+1)/secs, workerId: workerId }));
          next(null, i);
        }, 1000);
      }, function(err, data) {
        console.log(" [x] Done");

        ch.publish(ex, taskId + ".status", util.asBuffer({ taskId: taskId, eventType: "completed", workerId: workerId }));
        // Return results
        // Should contain all products of the call
        ch.sendToQueue(msg.properties.replyTo,
          util.asBuffer({"message":"Awesome results","secs":secs}),
          { correlationId: taskId });

        ch.ack(msg);
      });
    });
  });
});
