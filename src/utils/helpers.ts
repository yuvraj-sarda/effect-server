import express from 'express';

export const logRequest = (req: express.Request, requestDate: Date): void => {
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    headers: req.headers,
    body: req.body,
    timestamp: requestDate.toISOString()
  });
};

export const validateAuthHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

export const cleanEndpoint = (url: string): string => {
  return url.split('?')[0].replace(/\/$/, '');
}; 