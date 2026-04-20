import { Response } from 'express';
import { ExportService } from '../services/export.service';
import { ResponseUtil } from '../utils/response.utils';
import { AuthenticatedRequest } from '../types/api.types';

export const ExportController = {
  async requestExport(req: AuthenticatedRequest, res: Response) {
    const userId = req.user!.id;
    const jobId = await ExportService.requestExport(userId);
    return ResponseUtil.success(res, { jobId }, 'Export job started', 202);
  },

  async getExportStatus(req: AuthenticatedRequest, res: Response) {
    const jobId = req.params.jobId as string;
    const userId = req.user!.id;
    const job = await ExportService.getJobStatus(jobId, userId);

    if (!job) {
      return ResponseUtil.error(res, 'Export job not found', 404);
    }

    return ResponseUtil.success(res, {
      status: job.status,
      expires_at: job.expires_at,
      error_message: job.error_message,
      created_at: job.created_at,
    });
  },

  async downloadExport(req: AuthenticatedRequest, res: Response) {
    const jobId = req.params.jobId as string;
    const userId = req.user!.id;
    const job = await ExportService.getJobStatus(jobId, userId);

    if (!job) {
      return ResponseUtil.error(res, 'Export job not found', 404);
    }

    if (job.status !== 'completed' || !job.file_path) {
      return ResponseUtil.error(res, 'Export job is not completed', 400);
    }

    if (job.expires_at && new Date() > new Date(job.expires_at)) {
      return ResponseUtil.error(res, 'Download link has expired', 410);
    }

    return res.download(job.file_path);
  },

  async exportEarnings(req: AuthenticatedRequest, res: Response) {
    const mentorId = req.user!.id;
    const { from, to } = req.query;
    
    const { data, fileName } = await ExportService.getEarningsExport(
      mentorId,
      from as string,
      to as string
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(data);
  },
};
