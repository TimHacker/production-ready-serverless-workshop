const EventBridge = require('aws-sdk/clients/eventbridge');
const eventBridge = new EventBridge();
const SNS = require('aws-sdk/clients/sns');
const sns = new SNS();
const Log = require('@dazn/lambda-powertools-logger');
const wrap = require('@dazn/lambda-powertools-pattern-basic');

const busName = process.env.bus_name;
const topicArn = process.env.restaurant_notification_topic;

module.exports.handler = wrap(async (event) => {
  const order = event.detail;
  const snsReq = {
    Message: JSON.stringify(order),
    TopicArn: topicArn,
  };
  await sns.publish(snsReq).promise();

  const { restaurantName, orderId } = order;
  Log.debug(`notified restaurant of order`, {
    restaurantName,
    orderId,
  });

  await eventBridge
    .putEvents({
      Entries: [
        {
          Source: 'big-mouth',
          DetailType: 'restaurant_notified',
          Detail: JSON.stringify(order),
          EventBusName: busName,
        },
      ],
    })
    .promise();

  Log.debug(`published event into EventBridge`, {
    eventType: 'restaurant_notified',
    busName,
  });
});
