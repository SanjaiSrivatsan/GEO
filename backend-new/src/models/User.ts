import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  hashedPassword: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Index for email lookups
userSchema.index({ email: 1 });

export const User = model<IUser>('User', userSchema);
