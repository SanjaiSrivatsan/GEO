import { Schema, model, Document, Types } from 'mongoose';

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  businessProfileId?: Types.ObjectId;
  title?: string;
  status: 'ACTIVE' | 'ENDED' | 'ARCHIVED';
  contextData?: string;
  messageCount: string;
  startedAt: Date;
  lastMessageAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      index: true,
    },
    title: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'ENDED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    contextData: String,
    messageCount: {
      type: String,
      default: '0',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const ChatSession = model<IChatSession>(
  'ChatSession',
  chatSessionSchema
);
