/**
 * Request Validation Middleware
 * Validates request body sizes and structure
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function validateRequestSize(maxSizeBytes: number = 5 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      logger.security('Request size exceeded limit', {
        ip: req.ip,
        endpoint: req.path,
        size: contentLength,
        maxSize: maxSizeBytes.toString(),
      });
      
      return res.status(413).json({ 
        error: 'Request too large',
        maxSize: `${maxSizeBytes / (1024 * 1024)}MB`,
      });
    }
    
    next();
  };
}
