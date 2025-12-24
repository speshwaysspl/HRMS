import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || "us-east-1";
const dbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(dbClient);

let apiClient = null;

const getApiClient = () => {
  if (apiClient) return apiClient;
  if (!process.env.AWS_WEBSOCKET_URL) return null;

  // Endpoint must be the domain name of the API Gateway WebSocket API
  // e.g. https://xyz.execute-api.us-east-1.amazonaws.com/production
  apiClient = new ApiGatewayManagementApiClient({
    region,
    endpoint: process.env.AWS_WEBSOCKET_URL.replace('wss://', 'https://')
  });
  return apiClient;
};

export const sendToUser = async (userId, payload) => {
  if (!process.env.AWS_WEBSOCKET_URL || !process.env.WS_TABLE_NAME) {
    // console.log("Skipping AWS WS send: Missing AWS_WEBSOCKET_URL or WS_TABLE_NAME");
    return;
  }

  const client = getApiClient();
  if (!client) return;

  try {
    // 1. Get all connections for this user from DynamoDB
    // Assumes Table has GSI "UserIdIndex" with partition key "userId"
    const command = new QueryCommand({
      TableName: process.env.WS_TABLE_NAME,
      IndexName: "UserIdIndex",
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId.toString() }
    });

    const { Items } = await docClient.send(command);
    
    if (!Items || Items.length === 0) {
      // console.log(`No active WS connections for user ${userId}`);
      return;
    }

    // 2. Send payload to each connection
    const messageData = JSON.stringify(payload);
    
    const sendPromises = Items.map(async (item) => {
      const { connectionId } = item;
      try {
        await client.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: new TextEncoder().encode(messageData)
        }));
      } catch (err) {
        if (err.name === 'GoneException' || err.statusCode === 410) {
          // Connection is stale, remove it from DB
          try {
            await docClient.send(new DeleteCommand({
              TableName: process.env.WS_TABLE_NAME,
              Key: { connectionId }
            }));
          } catch (delErr) {
            console.error(`Failed to cleanup stale connection ${connectionId}:`, delErr);
          }
        } else {
          console.error(`Error sending to connection ${connectionId}:`, err);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("AWS WebSocket Broadcast Error:", error);
  }
};
