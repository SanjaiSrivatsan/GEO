import { ReinforcementTask, GapIssue } from '../models/index';
import { NotFoundError } from '../utils/errors';
import { Types } from 'mongoose';

export class ReinforcementService {
  static async generateReinforcementPlan(businessId: string): Promise<any[]> {
    const gaps = await GapIssue.find({
      businessProfileId: new Types.ObjectId(businessId),
    });

    const tasks = [];

    for (const gap of gaps) {
      const priority = gap.severity === 'HIGH' ? 'URGENT' : 'NORMAL';
      const taskType = this.getTaskType(gap.title);

      const task = await ReinforcementTask.findOneAndUpdate(
        {
          businessProfileId: new Types.ObjectId(businessId),
          title: `Action: ${gap.title}`,
        },
        {
          businessProfileId: new Types.ObjectId(businessId),
          gapIssueId: gap._id,
          title: `Action: ${gap.title}`,
          description: `Address the gap: ${gap.description}`,
          taskType,
          priority,
          estimatedHours: Math.ceil((gap as any).impactScore),
          status: 'PENDING',
          createdAt: new Date(),
        },
        { upsert: true, new: true }
      );

      tasks.push(task);
    }

    return tasks;
  }

  static async getTasks(businessId: string): Promise<any[]> {
    const tasks = await ReinforcementTask.find({
      businessProfileId: new Types.ObjectId(businessId),
    }).sort({ priority: -1 });

    return tasks;
  }

  static async updateTaskStatus(taskId: string, status: string): Promise<any> {
    const task = await ReinforcementTask.findByIdAndUpdate(
      new Types.ObjectId(taskId),
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!task) throw new NotFoundError('Task not found');
    return task;
  }

  private static getTaskType(gapTitle: string): string {
    if (gapTitle.includes('Social')) return 'SOCIAL_MEDIA';
    if (gapTitle.includes('Information')) return 'DATA_CLEANUP';
    if (gapTitle.includes('Review')) return 'REVIEW_MANAGEMENT';
    if (gapTitle.includes('SEO')) return 'SEO_OPTIMIZATION';
    return 'GENERAL';
  }
}

export default ReinforcementService;
