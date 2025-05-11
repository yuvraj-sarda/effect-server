import express from 'express';
import { logRequest, validateAuthHeader } from '../utils/helpers';

export const VALID_BEARER_TOKEN = 'sample.bearer.token.123';

export const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  const requestDate = new Date();
  logRequest(req, requestDate);
  
  const token = validateAuthHeader(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  // space for more authentication steps

  next();
}; 