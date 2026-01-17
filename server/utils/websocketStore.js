import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.WS_TABLE_NAME;

export const addConnection = async (userId, connectionId) => {
  if (!tableName) return;
  const item = {
    userId,
    connectionId,
    createdAt: new Date().toISOString()
  };
  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item
      })
    );
  } catch (error) {
    console.error("DynamoDB addConnection error:", error);
  }
};

export const removeConnection = async (userId, connectionId) => {
  if (!tableName) return;
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          userId,
          connectionId
        }
      })
    );
  } catch (error) {
    console.error("DynamoDB removeConnection error:", error);
  }
};

