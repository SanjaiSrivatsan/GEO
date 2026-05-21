import { Schema, model, Document, Types } from 'mongoose';

export interface IReinforcementTask extends Document {
  _id: Types.ObjectId;
  gapIssueId: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  actionType: string;
  title: string;
  description: string;
  implementationHint?: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  priorityOrder: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  createdAt: Date;
  updatedAt: Date;
}

const reinforcementTaskSchema = new Schema<IReinforcementTask>(
  {
    gapIssueId: {
      type: Schema.Types.ObjectId,
      ref: 'GapIssue',
      required: true,
      index: true,
    },
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    implementationHint: String,
    impact: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      required: true,
    },
    priorityOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ReinforcementTask = model<IReinforcementTask>(
  'ReinforcementTask',
  reinforcementTaskSchema
);
