import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * 🌟 Review Schema (MongoDB)
 *
 * Stores patient/customer reviews with sentiment analysis.
 *
 * Features:
 * - Star ratings (1-5)
 * - Text reviews with sentiment analysis
 * - Photo attachments support
 * - Response tracking from hospital/business
 * - Verification status for authentic reviews
 *
 * Performance:
 * - Indexed by resourceId, rating, createdAt
 * - Supports full-text search on reviewText
 * - Optimized for dashboard analytics
 */
@Schema({
  collection: 'reviews',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Review extends Document {
  @Prop({ required: true, index: true })
  resourceType: 'hospital' | 'business'; // Type of organization

  @Prop({ required: true, index: true })
  resourceId: string; // Hospital or Business UUID

  @Prop({ required: true })
  userId: string; // Reviewer UUID

  @Prop({ required: true })
  userName: string; // Cached for performance

  @Prop({ required: true })
  bookingId: string; // Associated booking UUID

  @Prop({ required: true, min: 1, max: 5, index: true })
  rating: number; // 1-5 stars

  @Prop({ required: true, maxlength: 2000 })
  reviewText: string; // Review content

  @Prop({ type: [String], default: [] })
  photos: string[]; // Photo URLs

  // Sentiment Analysis (computed by AI)
  @Prop({ enum: ['positive', 'neutral', 'negative'], index: true })
  sentiment?: 'positive' | 'neutral' | 'negative';

  @Prop({ min: 0, max: 1 })
  sentimentScore?: number; // 0.0 - 1.0 confidence

  @Prop({ type: [String], default: [] })
  keywords: string[]; // Extracted keywords for analytics

  // Response from hospital/business
  @Prop({ type: Object })
  response?: {
    text: string;
    respondedBy: string; // Admin user UUID
    respondedAt: Date;
  };

  // Verification & Moderation
  @Prop({ default: 'pending', enum: ['pending', 'verified', 'flagged', 'removed'], index: true })
  status: 'pending' | 'verified' | 'flagged' | 'removed';

  @Prop({ default: false })
  isVerifiedPurchase: boolean; // True if booking was completed

  @Prop({ default: 0 })
  helpfulCount: number; // Number of "helpful" votes

  @Prop({ default: 0 })
  reportCount: number; // Number of reports

  // Metadata
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ type: Object })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
  };
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes
ReviewSchema.index({ resourceType: 1, resourceId: 1, rating: -1 });
ReviewSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
ReviewSchema.index({ sentiment: 1, rating: -1 });
ReviewSchema.index({ reviewText: 'text' }); // Full-text search
