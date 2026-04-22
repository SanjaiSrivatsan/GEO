import { Schema, model, Document, Types } from 'mongoose';

export interface IReinforcementTask extends Document {
  gapIssueId?: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  taskName: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'completed' | 'archived';
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reinforcementTaskSchema = new Schema<IReinforcementTask>(
  {
    gapIssueId: {
      type: Schema.Types.ObjectId,
      ref: 'GapIssue',
    },
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: true,
    },
    description: String,
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'archived'],
      default: 'open',
    },
    dueDate: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'reinforcement_tasks',
  }
);

reinforcementTaskSchema.index({ businessProfileId: 1 });
reinforcementTaskSchema.index({ status: 1 });
reinforcementTaskSchema.index({ priority: 1 });

export const ReinforcementTask = model<IReinforcementTask>('ReinforcementTask', reinforcementTaskSchema);
