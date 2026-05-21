import { Schema, model, Document, Types } from 'mongoose';

export interface ISimulationRun extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  runType: string;
  configOverrides?: Record<string, any>;
  totalPrompts: number;
  mentionedCount: number;
  notMentionedCount: number;
  avgConfidence?: number;
  totalDurationMs: number;
  promptResultsSnapshot: Record<string, any>[];
  createdAt: Date;
  completedAt?: Date;
}

const simulationRunSchema = new Schema<ISimulationRun>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    runType: {
      type: String,
      default: 'full',
    },
    configOverrides: Schema.Types.Mixed,
    totalPrompts: {
      type: Number,
      required: true,
      default: 0,
    },
    mentionedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    notMentionedCount: {
      type: Number,
      required: true,
      default: 0,
    },
    avgConfidence: Number,
    totalDurationMs: {
      type: Number,
      required: true,
      default: 0,
    },
    promptResultsSnapshot: {
      type: [Schema.Types.Mixed as any],
      default: [],
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const SimulationRun = model<ISimulationRun>(
  'SimulationRun',
  simulationRunSchema
);
