import { Schema, model, Document, Types } from 'mongoose';

export interface IWebsiteContent extends Document {
  businessProfileId: Types.ObjectId;
  url: string;
  htmlContent: string;
  textContent: string;
  title?: string;
  metaDescription?: string;
  lastCrawledAt: Date;
  status: string;
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
    htmlContent: String,
    textContent: String,
    title: String,
    metaDescription: String,
    lastCrawledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'website_contents',
  }
);

websiteContentSchema.index({ businessProfileId: 1 });
websiteContentSchema.index({ url: 1 });

export const WebsiteContent = model<IWebsiteContent>('WebsiteContent', websiteContentSchema);
