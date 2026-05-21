import { Schema, model, Document, Types } from 'mongoose';

export interface IGeoResponse extends Document {
  _id: Types.ObjectId;
  geoPromptId: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  inputData?: string;
  responseText?: string;
  parsedResponse?: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  errorMessage?: string;
  tokensUsed?: number;
  executionTimeMs?: number;
  createdAt: Date;
}

const geoResponseSchema = new Schema<IGeoResponse>(
  {
    geoPromptId: {
      type: Schema.Types.ObjectId,
      ref: 'GeoPrompt',
      required: true,
      index: true,
    },
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    inputData: String,
    responseText: String,
    parsedResponse: String,
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PARTIAL'],
      required: true,
    },
    errorMessage: String,
    tokensUsed: Number,
    executionTimeMs: Number,
  },
  {
    timestamps: true,
  }
);

export const GeoResponse = model<IGeoResponse>('GeoResponse', geoResponseSchema);
