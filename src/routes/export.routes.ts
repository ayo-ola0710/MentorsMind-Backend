import { Router } from 'express';
import { ExportController } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler.utils';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /users/me/export:
 *   post:
 *     summary: Request personal data export
 *     tags: [Export]
 */
router.post('/users/me/export', asyncHandler(ExportController.requestExport));

/**
 * @swagger
 * /users/me/export/{jobId}:
 *   get:
 *     summary: Check export status
 *     tags: [Export]
 */
router.get('/users/me/export/:jobId', asyncHandler(ExportController.getExportStatus));

/**
 * @swagger
 * /users/me/export/{jobId}/download:
 *   get:
 *     summary: Download completed export
 *     tags: [Export]
 */
router.get('/users/me/export/:jobId/download', asyncHandler(ExportController.downloadExport));

/**
 * @swagger
 * /mentors/me/earnings/export:
 *   get:
 *     summary: CSV earnings export for mentors
 *     tags: [Export]
 */
router.get('/mentors/me/earnings/export', asyncHandler(ExportController.exportEarnings));

export default router;
