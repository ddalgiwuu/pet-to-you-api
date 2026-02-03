import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CommunityPostService } from '../services/community-post.service';
import { CommentService } from '../services/comment.service';
import { ReviewService } from '../services/review.service';
import { LikeService } from '../services/like.service';
import { CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { CreateCommentDto, UpdateCommentDto } from '../dto/create-comment.dto';
import {
  CreateReviewDto,
  UpdateReviewDto,
  AddReviewResponseDto,
} from '../dto/create-review.dto';
import { AuthRequest } from '../../../common/types/auth-request.type';
import { PostQueryDto, CommentQueryDto, ReviewQueryDto } from '../dto/query-params.dto';
import { LikeResourceType } from '../entities/like.entity';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(
    private readonly postService: CommunityPostService,
    private readonly commentService: CommentService,
    private readonly reviewService: ReviewService,
    private readonly likeService: LikeService,
  ) {}

  // ============================================================
  // POST ENDPOINTS
  // ============================================================

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new community post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  async createPost(@Request() req: AuthRequest, @Body() dto: CreatePostDto) {
    return this.postService.create(req.user.id, dto);
  }

  @Get('posts')
  @ApiOperation({ summary: 'Get all posts with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  async getPosts(@Query() query: PostQueryDto) {
    return this.postService.findAll(query);
  }

  @Get('posts/trending')
  @ApiOperation({ summary: 'Get trending posts' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trending posts retrieved' })
  async getTrendingPosts(@Query('limit') limit?: number) {
    return this.postService.getTrendingPosts(limit);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get a specific post by ID' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async getPost(@Param('id') id: string) {
    return this.postService.findOne(id);
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  async updatePost(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postService.update(id, req.user.id, dto);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully' })
  async deletePost(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.postService.remove(id, req.user.id);
  }

  @Post('posts/:id/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin/unpin a post (admin only)' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post pin status toggled' })
  async togglePostPin(@Param('id') id: string) {
    return this.postService.togglePin(id);
  }

  @Post('posts/:id/feature')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Feature/unfeature a post (admin only)' })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post feature status toggled' })
  async togglePostFeature(@Param('id') id: string) {
    return this.postService.toggleFeature(id);
  }

  // ============================================================
  // COMMENT ENDPOINTS
  // ============================================================

  @Post('posts/:postId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  async createComment(
    @Param('postId') postId: string,
    @Request() req: AuthRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(postId, req.user.id, dto);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Get comments with filters' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  async getComments(@Query() query: CommentQueryDto) {
    return this.commentService.findAll(query);
  }

  @Get('posts/:postId/comments/tree')
  @ApiOperation({ summary: 'Get comment tree for a post' })
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Comment tree retrieved' })
  async getCommentTree(@Param('postId') postId: string) {
    return this.commentService.getCommentTree(postId);
  }

  @Get('comments/:id')
  @ApiOperation({ summary: 'Get a specific comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment retrieved successfully' })
  async getComment(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Put('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  async updateComment(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentService.update(id, req.user.id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  async deleteComment(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.commentService.remove(id, req.user.id);
  }

  @Post('comments/:id/pin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin/unpin a comment (post author only)' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment pin status toggled' })
  async toggleCommentPin(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.commentService.togglePin(id, req.user.id);
  }

  // ============================================================
  // REVIEW ENDPOINTS
  // ============================================================

  @Post('reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async createReview(@Request() req: AuthRequest, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(req.user.id, dto);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get reviews with filters' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getReviews(@Query() query: ReviewQueryDto) {
    return this.reviewService.findAll(query);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get a specific review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  async getReview(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Get('reviews/stats/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get review statistics for a resource' })
  @ApiParam({ name: 'resourceType', description: 'Resource type (hospital, daycare, shelter)' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getReviewStats(
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.reviewService.getReviewStats(resourceType as any, resourceId);
  }

  @Put('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  async updateReview(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(id, req.user.id, dto);
  }

  @Delete('reviews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 204, description: 'Review deleted successfully' })
  async deleteReview(@Param('id') id: string, @Request() req: AuthRequest) {
    await this.reviewService.remove(id, req.user.id);
  }

  @Post('reviews/:id/response')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add business response to review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Response added successfully' })
  async addReviewResponse(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: AddReviewResponseDto,
  ) {
    return this.reviewService.addResponse(id, req.user.id, dto);
  }

  // ============================================================
  // LIKE ENDPOINTS
  // ============================================================

  @Post('likes/:resourceType/:resourceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a resource' })
  @ApiParam({ name: 'resourceType', enum: LikeResourceType })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 201, description: 'Resource liked successfully' })
  async likeResource(
    @Param('resourceType') resourceType: LikeResourceType,
    @Param('resourceId') resourceId: string,
    @Request() req: AuthRequest,
  ) {
    return this.likeService.likeResource(req.user.id, resourceType, resourceId);
  }

  @Delete('likes/:resourceType/:resourceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a resource' })
  @ApiParam({ name: 'resourceType', enum: LikeResourceType })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 204, description: 'Resource unliked successfully' })
  async unlikeResource(
    @Param('resourceType') resourceType: LikeResourceType,
    @Param('resourceId') resourceId: string,
    @Request() req: AuthRequest,
  ) {
    await this.likeService.unlikeResource(req.user.id, resourceType, resourceId);
  }

  @Post('likes/:resourceType/:resourceId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like status' })
  @ApiParam({ name: 'resourceType', enum: LikeResourceType })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Like toggled successfully' })
  async toggleLike(
    @Param('resourceType') resourceType: LikeResourceType,
    @Param('resourceId') resourceId: string,
    @Request() req: AuthRequest,
  ) {
    return this.likeService.toggleLike(req.user.id, resourceType, resourceId);
  }

  @Get('likes/:resourceType/:resourceId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user has liked a resource' })
  @ApiParam({ name: 'resourceType', enum: LikeResourceType })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Like status retrieved' })
  async checkUserLiked(
    @Param('resourceType') resourceType: LikeResourceType,
    @Param('resourceId') resourceId: string,
    @Request() req: AuthRequest,
  ) {
    const hasLiked = await this.likeService.hasUserLiked(
      req.user.id,
      resourceType,
      resourceId,
    );
    return { hasLiked };
  }

  @Get('likes/my-likes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my liked resources' })
  @ApiQuery({ name: 'resourceType', required: false, enum: LikeResourceType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liked resources retrieved' })
  async getMyLikes(
    @Request() req: AuthRequest,
    @Query('resourceType') resourceType?: LikeResourceType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.likeService.getUserLikes(req.user.id, resourceType, page, limit);
  }
}
