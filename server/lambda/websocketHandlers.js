// server/lambda/websocketHandlers.js
/*
  These are standard AWS Lambda handlers for managing WebSocket connections.
  You should deploy these as separate Lambda functions or integrate them into your serverless.yml.
  
  Prerequisites:
  1. DynamoDB Table "WebSocketConnections" (Partition Key: connectionId).
     - Global Secondary Index (GSI):
       - IndexName: "UserIdIndex"
       - Partition Key: userId
       - Projection: KEYS_ONLY or ALL
  2. Environment Variables:
     - WS_TABLE_NAME: Name of the DynamoDB table
*/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.WS_TABLE_NAME || "WebSocketConnections";

export const connectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log("Connected:", connectionId);
  
  // In a real app, you might want to authenticate here via query params or authorizer context
  // e.g. wss://...?token=...
  
  return { statusCode: 200, body: "Connected" };
};

export const disconnectHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log("Disconnected:", connectionId);

  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { connectionId }
    }));
  } catch (err) {
    console.error("Error deleting connection:", err);
  }

  return { statusCode: 200, body: "Disconnected" };
};

// Default handler - expects JSON: { "action": "join", "userId": "..." }
export const defaultHandler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  let body = {};
  
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (body.action === 'join' && body.userId) {
    console.log(`User ${body.userId} joining with connection ${connectionId}`);
    try {
      // Save mapping: connectionId -> userId
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          connectionId,
          userId: body.userId,
          connectedAt: new Date().toISOString(),
          // Set TTL if desired
          // ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) 
        }
      }));
      return { statusCode: 200, body: "Joined" };
    } catch (err) {
      console.error("Error saving connection:", err);
      return { statusCode: 500, body: "Failed to join" };
    }
  }

  return { statusCode: 200, body: "OK" };
};
