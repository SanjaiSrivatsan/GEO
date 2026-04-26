import { Schema, model, Document, Types } from 'mongoose';

export interface ISimulationRun extends Document {
  businessProfileId: Types.ObjectId;
  scenarioName: string;
  parameters?: Record<string, unknown>;
  results?: Record<string, unknown>;
  projectedScore?: number;
  executedAt: Date;
  createdAt: Date;
}

const simulationRunSchema = new Schema<ISimulationRun>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    scenarioName: {
      type: String,
      required: true,
    },
    parameters: Schema.Types.Mixed,
    results: Schema.Types.Mixed,
    projectedScore: Number,
    executedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'simulation_runs',
  }
);

simulationRunSchema.index({ businessProfileId: 1 });

export const SimulationRun = model<ISimulationRun>('SimulationRun', simulationRunSchema);
