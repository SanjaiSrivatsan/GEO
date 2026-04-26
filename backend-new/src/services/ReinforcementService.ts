import logger from '../config/logger.js';
import { ReinforcementTask, GapIssue } from '../models/index.js';

export class ReinforcementService {
  static async generatePlan(businessId: string) {
    logger.info(`Generating reinforcement plan for business ${businessId}`);

    try {
      // Get all open gaps
      const gaps = await GapIssue.find({ businessProfileId: businessId, status: 'open' }).lean();

      // Create tasks from gaps
      for (const gap of gaps) {
        const task = new ReinforcementTask({
          gapIssueId: gap._id,
          businessProfileId: businessId,
          taskName: gap.title,
          description: gap.description,
          priority: this.mapSeverityToPriority(gap.severity),
          status: 'open',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        });
        await task.save();
      }

      const tasks = await ReinforcementTask.find({ businessProfileId: businessId }).lean();

      logger.info(`Generated ${tasks.length} reinforcement tasks for business ${businessId}`);

      return {
        businessId,
        taskCount: tasks.length,
        tasks,
      };
    } catch (error) {
      logger.error('Reinforcement plan generation error:', error);
      throw error;
    }
  }

  private static mapSeverityToPriority(
    severity: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      default:
        return 'low';
    }
  }

  static async getTasks(businessId: string, status?: string) {
    let query: any = { businessProfileId: businessId };

    if (status) {
      query.status = status;
    }

    const tasks = await ReinforcementTask.find(query).sort({ priority: -1, createdAt: -1 }).lean();

    return {
      businessId,
      taskCount: tasks.length,
      tasks,
    };
  }

  static async updateTaskStatus(
    taskId: string,
    status: 'open' | 'in_progress' | 'completed' | 'archived'
  ) {
    const updateData: any = { status };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const task = await ReinforcementTask.findByIdAndUpdate(taskId, { $set: updateData }, { new: true }).lean();

    if (!task) {
      throw new Error('Task not found');
    }

    logger.info(`Task ${taskId} status updated to ${status}`);

    return task;
  }
}
