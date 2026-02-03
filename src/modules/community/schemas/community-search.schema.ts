import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * MongoDB schema for full-text search on community posts
 * This is used alongside PostgreSQL for search optimization
 */
@Schema({ collection: 'community_posts_search', timestamps: true })
export class CommunityPostSearch extends Document {
  @Prop({ required: true, index: true })
  postId: string; // Reference to PostgreSQL post ID

  @Prop({ required: true, text: true })
  title: string;

  @Prop({ required: true, text: true })
  content: string;

  @Prop({ type: [String], index: true })
  tags: string[];

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ index: true })
  petId?: string;

  @Prop({ default: 0, index: true })
  likeCount: number;

  @Prop({ default: 0, index: true })
  commentCount: number;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0, index: true })
  trendingScore: number;

  @Prop({ required: true, index: true })
  moderationStatus: string;

  @Prop({ default: false, index: true })
  isPinned: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const CommunityPostSearchSchema = SchemaFactory.createForClass(
  CommunityPostSearch,
);

// Create text index for full-text search
CommunityPostSearchSchema.index(
  {
    title: 'text',
    content: 'text',
    tags: 'text',
  },
  {
    weights: {
      title: 10,
      tags: 5,
      content: 1,
    },
    name: 'community_post_text_search',
  },
);

// Compound indexes for common queries
CommunityPostSearchSchema.index({ category: 1, createdAt: -1 });
CommunityPostSearchSchema.index({ userId: 1, createdAt: -1 });
CommunityPostSearchSchema.index({ trendingScore: -1, createdAt: -1 });
CommunityPostSearchSchema.index({
  moderationStatus: 1,
  isDeleted: 1,
  createdAt: -1,
});
CommunityPostSearchSchema.index({ isPinned: -1, createdAt: -1 });

/**
 * MongoDB schema for review search optimization
 */
@Schema({ collection: 'reviews_search', timestamps: true })
export class ReviewSearch extends Document {
  @Prop({ required: true, index: true })
  reviewId: string; // Reference to PostgreSQL review ID

  @Prop({ text: true })
  title?: string;

  @Prop({ required: true, text: true })
  content: string;

  @Prop({ required: true, index: true })
  resourceType: string;

  @Prop({ required: true, index: true })
  resourceId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  rating: number;

  @Prop({ index: true })
  serviceRating?: number;

  @Prop({ index: true })
  facilityRating?: number;

  @Prop({ index: true })
  priceRating?: number;

  @Prop({ index: true })
  staffRating?: number;

  @Prop({ index: true })
  cleanlinessRating?: number;

  @Prop({ default: 0, index: true })
  helpfulCount: number;

  @Prop({ default: 0 })
  unhelpfulCount: number;

  @Prop({ default: false, index: true })
  isVerifiedVisit: boolean;

  @Prop({ required: true, index: true })
  moderationStatus: string;

  @Prop({ default: false, index: true })
  isFeatured: boolean;

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop()
  visitDate?: Date;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const ReviewSearchSchema = SchemaFactory.createForClass(ReviewSearch);

// Create text index for full-text search on reviews
ReviewSearchSchema.index(
  {
    title: 'text',
    content: 'text',
  },
  {
    weights: {
      title: 10,
      content: 1,
    },
    name: 'review_text_search',
  },
);

// Compound indexes for review queries
ReviewSearchSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
ReviewSearchSchema.index({ rating: -1, createdAt: -1 });
ReviewSearchSchema.index({ helpfulCount: -1, createdAt: -1 });
ReviewSearchSchema.index({ isVerifiedVisit: 1, rating: -1 });
ReviewSearchSchema.index({ moderationStatus: 1, isDeleted: 1, createdAt: -1 });
