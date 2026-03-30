import { Request, Response, NextFunction } from 'express';
import { LearnerService } from '../services/learners.service';

export class LearnerController {
  static async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const learnerId = (req as any).user.userId;
      const progress = await LearnerService.getProgressSummary(learnerId);
      res.json({ status: 'success', data: progress });
    } catch (err) { next(err); }
  }

  static async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const learnerId = (req as any).user.userId;
      const timeline = await LearnerService.getTimeline(learnerId);
      res.json({ status: 'success', data: timeline });
    } catch (err) { next(err); }
  }
}
