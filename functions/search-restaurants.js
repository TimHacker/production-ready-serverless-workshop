const ssm = require('@middy/ssm');
const DocumentClient = require('aws-sdk/clients/dynamodb').DocumentClient;
const dynamodb = new DocumentClient();
const Log = require('@dazn/lambda-powertools-logger');
const wrap = require('@dazn/lambda-powertools-pattern-basic');

const { serviceName, stage } = process.env;
const tableName = process.env.restaurants_table;

const findRestaurantsByTheme = async (theme, count) => {
  Log.debug(`finding up to x restaurants with theme`, {
    count,
    theme,
  });
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: 'contains(themes, :theme)',
    ExpressionAttributeValues: { ':theme': theme },
  };

  const resp = await dynamodb.scan(req).promise();
  Log.debug(`found restaurants`, {
    count: resp.Items.length,
  });
  return resp.Items;
};

module.exports.handler = wrap(async (event, context) => {
  const req = JSON.parse(event.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults
  );

  Log.debug(`secret from SSM:`, {
    secretString: context.secretString,
  });

  const response = {
    statusCode: 200,
    headers: {
      secret: context.secretString,
    },
    body: JSON.stringify(restaurants),
  };

  return response;
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 minute
    setToContext: true,
    fetchData: {
      config: `/${serviceName}/${stage}/search-restaurants/config`,
      secretString: `/${serviceName}/${stage}/search-restaurants/secretString`,
    },
  })
);
