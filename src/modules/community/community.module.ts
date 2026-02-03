import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunityPost } from './entities/community-post.entity';
import { Comment } from './entities/comment.entity';
import { Review } from './entities/review.entity';
import { Like } from './entities/like.entity';
import {
  CommunityPostSearch,
  CommunityPostSearchSchema,
  ReviewSearch,
  ReviewSearchSchema,
} from './schemas/community-search.schema';
import { CommunityPostService } from './services/community-post.service';
import { CommentService } from './services/comment.service';
import { ReviewService } from './services/review.service';
import { LikeService } from './services/like.service';
import { CommunityController } from './controllers/community.controller';

@Module({
  imports: [
    // TypeORM entities (PostgreSQL)
    TypeOrmModule.forFeature([
      CommunityPost,
      Comment,
      Review,
      Like,
    ]),
    // Mongoose schemas (MongoDB)
    MongooseModule.forFeature([
      {
        name: CommunityPostSearch.name,
        schema: CommunityPostSearchSchema,
      },
      {
        name: ReviewSearch.name,
        schema: ReviewSearchSchema,
      },
    ]),
  ],
  controllers: [CommunityController],
  providers: [
    CommunityPostService,
    CommentService,
    ReviewService,
    LikeService,
  ],
  exports: [
    CommunityPostService,
    CommentService,
    ReviewService,
    LikeService,
  ],
})
export class CommunityModule {}
