import { GoalModel, Goal } from '../models/goal.model';
import { createError } from '../middleware/errorHandler';

import { LearnerService } from './learners.service';

export class GoalService {
  static async createGoal(learnerId: string, data: Partial<Goal>): Promise<Goal> {
    const goal = await GoalModel.create({ ...data, learner_id: learnerId });
    await LearnerService.invalidateCache(learnerId);
    return goal;
  }

  static async listGoals(learnerId: string): Promise<Goal[]> {
    return await GoalModel.findByLearnerId(learnerId);
  }

  static async getGoal(id: string, learnerId: string): Promise<Goal> {
    const goal = await GoalModel.findById(id);
    if (!goal || goal.learner_id !== learnerId) {
      throw createError('Goal not found', 404);
    }
    return goal;
  }

  static async updateGoal(id: string, learnerId: string, data: Partial<Goal>): Promise<Goal> {
    const goal = await this.getGoal(id, learnerId);
    
    const updateData = { ...data };
    
    // Auto-complete logic
    if (updateData.progress !== undefined) {
      if (updateData.progress >= 100) {
        updateData.status = 'completed';
      } else if (updateData.progress < 100 && goal.status === 'completed') {
        updateData.status = 'active';
      }
    }

    const updated = await GoalModel.update(id, updateData);
    if (!updated) throw createError('Failed to update goal', 500);

    await LearnerService.invalidateCache(learnerId);
    return updated;
  }

  static async updateProgress(id: string, learnerId: string, progress: number): Promise<Goal> {
    const data: Partial<Goal> = { progress };
    if (progress >= 100) {
      data.status = 'completed';
    }
    return await this.updateGoal(id, learnerId, data);
  }

  static async deleteGoal(id: string, learnerId: string): Promise<void> {
    await this.getGoal(id, learnerId);
    await GoalModel.delete(id);
  }

  static async linkSession(id: string, learnerId: string, bookingId: string): Promise<void> {
    await this.getGoal(id, learnerId);
    // Note: In a real system, we'd also verify booking exists and belongs to learner
    await GoalModel.linkBooking(id, bookingId);
  }
}
