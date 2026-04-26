import { Schema, model, Document, Types } from 'mongoose';

export interface IGoogleConnection extends Document {
  userId: Types.ObjectId;
  refreshToken: string;
  accessToken: string;
  scope: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const googleConnectionSchema = new Schema<IGoogleConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    scope: String,
    expiresAt: Date,
  },
  {
    timestamps: true,
    collection: 'google_connections',
  }
);

googleConnectionSchema.index({ userId: 1 });

export const GoogleConnection = model<IGoogleConnection>('GoogleConnection', googleConnectionSchema);
