import { Schema, model, Document, Types } from 'mongoose';

export interface IWebsiteContent extends Document {
  _id: Types.ObjectId;
  businessProfileId: Types.ObjectId;
  url: string;
  pageType?: string;
  rawHtml?: string;
  cleanedText?: string;
  title?: string;
  metaDescription?: string;
  h1Tags?: string;
  h2Tags?: string;
  schemaMarkup?: string;
  extractedName?: string;
  extractedAddress?: string;
  extractedPhone?: string;
  wordCount?: number;
  entityMentions: number;
  locationMentions: number;
  crawledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const websiteContentSchema = new Schema<IWebsiteContent>(
  {
    businessProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'BusinessProfile',
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    pageType: String,
    rawHtml: String,
    cleanedText: String,
    title: String,
    metaDescription: String,
    h1Tags: String,
    h2Tags: String,
    schemaMarkup: String,
    extractedName: String,
    extractedAddress: String,
    extractedPhone: String,
    wordCount: Number,
    entityMentions: {
      type: Number,
      default: 0,
    },
    locationMentions: {
      type: Number,
      default: 0,
    },
    crawledAt: Date,
  },
  {
    timestamps: true,
  }
);

export const WebsiteContent = model<IWebsiteContent>(
  'WebsiteContent',
  websiteContentSchema
);
