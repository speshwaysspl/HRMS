import WebSocketConnection from "../models/WebSocketConnection.js";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";

const getClient = () => {
  let endpoint = process.env.WS_API_ENDPOINT;
  if (!endpoint) return null;
  if (endpoint.startsWith('ws://')) endpoint = endpoint.replace('ws://', 'http://');
  if (endpoint.startsWith('wss://')) endpoint = endpoint.replace('wss://', 'https://');
  const hostMatch = endpoint.match(/^https?:\/\/[^/]+/);
  if (hostMatch && endpoint.includes('localhost')) {
    endpoint = hostMatch[0];
  }
  return new ApiGatewayManagementApiClient({ endpoint });
};

export const broadcastToUser = async (userId, payload) => {
  try {
    const client = getClient();
    if (!client) return;
    const conns = await WebSocketConnection.find({ userId });
    const data = Buffer.from(JSON.stringify(payload));
    await Promise.all(conns.map(c => client.send(new PostToConnectionCommand({ ConnectionId: c.connectionId, Data: data })).catch(() => null)));
  } catch {}
};