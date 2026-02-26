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

export function validateImageSize(req: Request, res: Response, next: NextFunction) {
  const { image } = req.body;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  
  if (image && typeof image === 'string') {
    // Base64 images are ~33% larger than raw bytes
    const estimatedSize = (image.length * 0.75);
    
    if (estimatedSize > MAX_IMAGE_SIZE) {
      logger.warn('Image size validation failed', {
        endpoint: req.path,
        estimatedSize: Math.round(estimatedSize / 1024 / 1024) + 'MB',
      });
      
      return res.status(413).json({ 
        error: 'Image too large',
        maxSize: '10MB',
        message: 'Please compress or resize your image',
      });
    }
  }
  
  next();
}
