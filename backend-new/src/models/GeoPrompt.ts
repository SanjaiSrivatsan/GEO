import { Schema, model, Document } from 'mongoose';

export interface IGeoPrompt extends Document {
  promptId: string;
  version: string;
  category: string;
  title: string;
  description: string;
  promptText: string;
  systemMessage?: string;
  temperature: number;
  maxTokens: number;
  expectedSchema?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
}

const geoPromptSchema = new Schema<IGeoPrompt>(
  {
    promptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: String,
      default: '1.0',
    },
    category: {
      type: String,
      enum: ['ENTITY_DEFINITION', 'CATEGORY_VISIBILITY', 'COMPARISON_ALTERNATIVES', 'TRUST_REVIEWS', 'LOCAL_DISCOVERY'],
      required: true,
    },
    title: String,
    description: String,
    promptText: {
      type: String,
      required: true,
    },
    systemMessage: String,
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.2,
    },
    maxTokens: {
      type: Number,
      default: 500,
    },
    expectedSchema: Schema.Types.Mixed,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'geo_prompts',
  }
);

geoPromptSchema.index({ promptId: 1 });
geoPromptSchema.index({ category: 1 });

export const GeoPrompt = model<IGeoPrompt>('GeoPrompt', geoPromptSchema);
