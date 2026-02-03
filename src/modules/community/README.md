# Community Module

Comprehensive community engagement module with posts, comments, reviews, and social interactions.

## Features

### ✅ Community Posts
- User-generated content with categories (팁/정보, 질문, 자랑, 후기)
- Full-text search powered by MongoDB
- Trending algorithm with time-decay
- Tag system for categorization
- Pin/feature functionality
- Auto-moderation system
- View/like/comment tracking
- Media support (images/videos)

### ✅ Comment System
- Nested threading (materialized path tree structure)
- Max depth limit (5 levels)
- Author reply highlighting
- Pin best comments
- Edit tracking
- Like system

### ✅ Review System
- Multi-resource reviews (hospitals, daycares, shelters)
- 5-star rating system
- Detailed ratings (service, facility, price, staff, cleanliness)
- Verified visit tracking (linked to bookings)
- Business response functionality
- Helpful/unhelpful voting
- Photo support
- Rating aggregation and statistics

### ✅ Like System
- Polymorphic likes (posts, comments, reviews)
- Duplicate prevention
- Real-time count updates
- User like history

### ✅ Moderation
- Auto-flag suspicious content
- Manual moderation workflow
- Report system
- Approval/rejection tracking

## Architecture

### Database Strategy

**PostgreSQL**: Relational data, transactions, complex queries
- Entity relationships
- User/pet references
- Transactional integrity

**MongoDB**: Full-text search, trending calculation
- Search optimization
- Performance metrics
- Denormalized data

### Performance Optimizations

1. **Denormalized Counts**
   - `likeCount`, `commentCount`, `viewCount` stored directly
   - Avoid expensive COUNT queries
   - Updated on engagement changes

2. **Trending Algorithm**
   ```typescript
   score = (likes * 2 + comments * 3 + views * 0.1) / ageInHours^1.5
   ```
   - Time-decay factor
   - Weighted engagement metrics
   - Cached scores (15-min TTL recommended)

3. **Indexes**
   - Compound indexes: `(category, createdAt)`, `(userId, createdAt)`
   - Text indexes: MongoDB full-text search
   - Partial indexes: `(isDeleted, moderationStatus)`

4. **Pagination**
   - Cursor-based for large datasets
   - Offset-based for small datasets
   - Configurable limits (max 100)

## API Endpoints

### Posts
```
POST   /community/posts                 - Create post
GET    /community/posts                 - List posts (filtered, paginated)
GET    /community/posts/trending        - Get trending posts
GET    /community/posts/:id             - Get single post
PUT    /community/posts/:id             - Update post
DELETE /community/posts/:id             - Delete post
POST   /community/posts/:id/pin         - Toggle pin (admin)
POST   /community/posts/:id/feature     - Toggle feature (admin)
```

### Comments
```
POST   /community/posts/:postId/comments    - Create comment
GET    /community/comments                  - List comments (filtered)
GET    /community/posts/:postId/comments/tree - Get comment tree
GET    /community/comments/:id              - Get single comment
PUT    /community/comments/:id              - Update comment
DELETE /community/comments/:id              - Delete comment
POST   /community/comments/:id/pin          - Toggle pin (author)
```

### Reviews
```
POST   /community/reviews                       - Create review
GET    /community/reviews                       - List reviews (filtered)
GET    /community/reviews/:id                   - Get single review
GET    /community/reviews/stats/:type/:id       - Get statistics
PUT    /community/reviews/:id                   - Update review
DELETE /community/reviews/:id                   - Delete review
POST   /community/reviews/:id/response          - Add business response
```

### Likes
```
POST   /community/likes/:type/:id               - Like resource
DELETE /community/likes/:type/:id               - Unlike resource
POST   /community/likes/:type/:id/toggle        - Toggle like
GET    /community/likes/:type/:id/check         - Check if liked
GET    /community/likes/my-likes                - Get user's likes
```

## Usage Examples

### Create a Post
```typescript
POST /community/posts
{
  "title": "강아지 분리불안 해결 팁",
  "content": "우리 강아지 분리불안이 심했는데...",
  "category": "tip_info",
  "tags": ["분리불안", "훈련", "강아지"],
  "petId": "uuid",
  "imageUrls": ["https://..."]
}
```

### Search Posts
```typescript
GET /community/posts?search=훈련&category=tip_info&sortBy=trendingScore&limit=20
```

### Create Nested Comment
```typescript
POST /community/posts/:postId/comments
{
  "content": "정말 유용한 정보네요!",
  "parentCommentId": "parent-comment-uuid"  // For replies
}
```

### Create Review with Details
```typescript
POST /community/reviews
{
  "resourceType": "hospital",
  "resourceId": "hospital-uuid",
  "rating": 5,
  "title": "정말 친절한 병원",
  "content": "우리 강아지를 세심하게 봐주셨어요",
  "serviceRating": 5,
  "facilityRating": 4,
  "priceRating": 4,
  "staffRating": 5,
  "cleanlinessRating": 5,
  "photoUrls": ["https://..."],
  "visitDate": "2024-01-15",
  "bookingId": "booking-uuid"  // For verification
}
```

### Toggle Like
```typescript
POST /community/likes/post/:postId/toggle
Response: { "liked": true, "likeCount": 42 }
```

## Moderation System

### Auto-Moderation Triggers
Content is flagged for review if it contains:
- 광고/홍보 (advertising)
- 판매/구매 (sales)
- 연락처/전화번호 (contact info)
- HTTP links
- 욕설/비방 (profanity/slander)

### Moderation Statuses
- `PENDING` - Awaiting review
- `APPROVED` - Visible to public
- `REJECTED` - Hidden from public
- `FLAGGED` - User-reported
- `REMOVED` - Deleted by admin

### Report System
- Users can report content
- Auto-flag after 5 reports (posts) or 3 reports (comments/reviews)
- Admin review dashboard (TODO)

## Trending Algorithm

### Calculation
```typescript
if (ageInHours < 1) {
  score = (likes * 2 + comments * 3 + views * 0.1) * 10;
} else {
  score = (likes * 2 + comments * 3 + views * 0.1) / (ageInHours ^ 1.5);
}
```

### Update Strategy
- Recalculate on engagement changes
- Batch update via cron job (recommended every 15 minutes)
- Cache trending results (15-min TTL)

## Review Statistics

### Available Metrics
- Average rating (overall + detailed)
- Total review count
- Rating distribution (1-5 stars)
- Verified vs unverified breakdown
- Average detailed ratings (service, facility, price, staff, cleanliness)

### Endpoint
```typescript
GET /community/reviews/stats/hospital/:hospitalId
Response: {
  "averageRating": 4.5,
  "totalReviews": 128,
  "ratingDistribution": {
    "1": 2,
    "2": 5,
    "3": 15,
    "4": 45,
    "5": 61
  },
  "averageServiceRating": 4.6,
  "averageFacilityRating": 4.3,
  ...
}
```

## Integration Points

### User Module
- Author relationships
- Permission checks
- User profiles

### Pet Module
- Pet-specific posts
- Pet profile integration

### Booking Module
- Review verification
- Verified visit tracking

### Hospital/Daycare Modules
- Review aggregation
- Rating updates
- Business responses

## Future Enhancements

### Planned Features
- [ ] Real-time notifications (websockets)
- [ ] Mention system (@username)
- [ ] Advanced moderation dashboard
- [ ] Content recommendation engine
- [ ] Spam detection ML model
- [ ] Image moderation (NSFW detection)
- [ ] Analytics dashboard
- [ ] Export/reporting features
- [ ] Gamification (badges, reputation)
- [ ] Translation support

### Performance Improvements
- [ ] Redis caching layer
- [ ] CDN for media files
- [ ] Read replicas for PostgreSQL
- [ ] MongoDB sharding
- [ ] Elasticsearch integration
- [ ] GraphQL API option

## Testing

### Unit Tests
```bash
npm run test -- community
```

### Integration Tests
```bash
npm run test:e2e -- community
```

### Load Testing
```bash
# Test trending calculation under load
npm run test:load -- community/trending
```

## Monitoring

### Key Metrics
- Post creation rate
- Comment engagement rate
- Review submission rate
- Average response time
- Search query performance
- Moderation queue length

### Alerts
- High moderation queue (>100 items)
- Slow search queries (>500ms)
- High error rates (>1%)
- Spam detection triggers

## Database Migrations

### Create Tables
```bash
npm run migration:generate -- -n CreateCommunityTables
npm run migration:run
```

### MongoDB Indexes
```typescript
// Run in MongoDB shell or migration script
db.community_posts_search.createIndex({
  title: "text",
  content: "text",
  tags: "text"
}, {
  weights: { title: 10, tags: 5, content: 1 }
});
```

## Security Considerations

- ✅ Input sanitization (XSS prevention)
- ✅ Rate limiting on write operations
- ✅ CSRF protection
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ NoSQL injection prevention (Mongoose validation)
- ✅ File upload validation
- ✅ Content moderation
- ✅ User permission checks

## License

Part of Pet-to-You API - Proprietary
