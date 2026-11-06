import { Response } from 'express';

export const notificationClients = new Map<string, Set<Response>>();

export function publishNotification(userId: string, notification: unknown) {
  notificationClients.get(userId)?.forEach((client) => {
    client.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
  });
}
