import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { ExcelValidationError } from '../services/excelParserService';

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const originalname = file.originalname || '';
  const isXlsxExt = originalname.toLowerCase().endsWith('.xlsx');

  if (!isXlsxExt) {
    return cb(new ExcelValidationError('Only Excel (.xlsx) files are supported', 400));
  }

  cb(null, true);
};

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB max file size
    files: 1,
  },
  fileFilter,
});

export const uploadExcelMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  multerUpload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({
            success: false,
            message: 'File size exceeds maximum allowed limit (20MB)',
          });
          return;
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          res.status(400).json({
            success: false,
            message: "Unexpected upload field. File must be provided in field 'file'",
          });
          return;
        }
        res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
        return;
      }

      if (err instanceof ExcelValidationError || err.statusCode === 400) {
        res.status(400).json({
          success: false,
          message: err.message,
          details: err.details,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: err.message || 'Error processing uploaded file',
      });
      return;
    }

    next();
  });
};

export default uploadExcelMiddleware;
