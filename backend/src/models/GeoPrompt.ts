import { Schema, model, Document } from 'mongoose';

export interface IGeoPrompt extends Document {
  _id: string;
  promptId: string;
  version: string;
  category: string;
  title: string;
  description?: string;
  promptText: string;
  systemMessage?: string;
  temperature: number;
  maxTokens: number;
  expectedOutputSchema: Record<string, any>;
  scoringWeight: number;
  isActive: string;
  executionOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const geoPromptSchema = new Schema<IGeoPrompt>(
  {
    _id: {
      type: String,
      default: () => require('crypto').randomUUID(),
    },
    promptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: '1.0',
    },
    category: {
      type: String,
      required: true,
      enum: [
        'ENTITY_DEFINITION',
        'CATEGORY_VISIBILITY',
        'COMPARISON_ALTERNATIVES',
        'TRUST_REVIEWS',
        'LOCAL_DISCOVERY',
      ],
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    promptText: {
      type: String,
      required: true,
    },
    systemMessage: String,
    temperature: {
      type: Number,
      required: true,
      default: 0.2,
    },
    maxTokens: {
      type: Number,
      required: true,
      default: 500,
    },
    expectedOutputSchema: {
      type: Schema.Types.Mixed,
      required: true,
    },
    scoringWeight: {
      type: Number,
      required: true,
      default: 1.0,
    },
    isActive: {
      type: String,
      default: 'true',
    },
    executionOrder: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const GeoPrompt = model<IGeoPrompt>('GeoPrompt', geoPromptSchema);
