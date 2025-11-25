import dotenv from "dotenv";
import connectToDatabase from "./db/db.js";
import WebSocketConnection from "./models/WebSocketConnection.js";

dotenv.config({ quiet: true });

export const connect = async (event) => {
  await connectToDatabase();
  const { connectionId, domainName, stage } = event.requestContext || {};
  const params = new URLSearchParams(event.queryStringParameters || {});
  const userId = params.get("userId");
  if (!userId) return { statusCode: 400, body: "Missing userId" };
  if (!process.env.WS_API_ENDPOINT && domainName && stage) {
    process.env.WS_API_ENDPOINT = `https://${domainName}/${stage}`;
  }
  await WebSocketConnection.create({ connectionId, userId });
  return { statusCode: 200, body: "connected" };
};

export const disconnect = async (event) => {
  await connectToDatabase();
  const { connectionId } = event.requestContext || {};
  await WebSocketConnection.deleteMany({ connectionId });
  return { statusCode: 200, body: "disconnected" };
};

export const defaultHandler = async () => ({ statusCode: 200, body: "ok" });