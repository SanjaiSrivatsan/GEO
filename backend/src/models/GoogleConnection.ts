import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleConnection extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  connectedEmail: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  isActive: boolean;
  connectedAt: Date;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const googleConnectionSchema = new Schema<IGoogleConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    connectedEmail: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const GoogleConnection = model<IGoogleConnection>(
  'GoogleConnection',
  googleConnectionSchema
);
