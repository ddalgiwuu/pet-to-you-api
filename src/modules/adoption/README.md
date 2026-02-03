# Adoption Module

Complete adoption system with shelter verification, pet matching, and application workflow management.

## Features

### 1. Shelter Entity & Verification
- **Business Registration Verification**: Validates Korean business registration numbers (사업자등록번호)
- **Trust Score System**: Calculates shelter reliability (0.00 - 1.00) based on:
  - Verification status (40% weight)
  - Adoption success rate (30% weight)
  - Complaint history (20% weight)
  - Suspension history (10% weight)
- **Anti-Fraud Features**:
  - High return rate detection (>30%)
  - Suspicious pattern flagging
  - Automatic suspension for critical violations
  - Complaint history tracking
- **Performance Metrics**:
  - Total adoptions, successful adoptions, returned adoptions
  - Average adoption days
  - Adoption success rate
  - Complaint count and severity tracking

### 2. Pet Listing Entity
- **Comprehensive Pet Information**:
  - Basic info (species, breed, age, size, health status)
  - Medical history and vaccination records
  - Personality assessment and behavior traits
  - Energy level classification
  - Social compatibility (kids, dogs, cats)
- **Rescue Story**: Track rescue date, location, and background
- **Adoption Requirements**: Specify ideal home, experience level, special needs
- **Media Support**: Primary photo, multiple photos, and videos
- **Adoption Status Tracking**: Available, Pending, Adopted, On-Hold, Withdrawn

### 3. Adoption Application Entity
- **Applicant Information**:
  - Personal details and contact information
  - Living situation (home type, ownership, yard, landlord approval)
  - Household composition (adults, children, allergies)
- **Pet Experience**:
  - Experience level classification
  - Current and past pet ownership
  - Veterinary references
- **Financial Commitment**:
  - Budget planning
  - Emergency care preparedness
  - Willingness for medical procedures
- **Application Workflow**:
  - Interview scheduling and scoring
  - Home visit evaluation
  - Post-adoption follow-up
  - Return tracking
- **Completeness Scoring**: Automatic validation of application quality

### 4. MongoDB Search Schema
Optimized for fast faceted search and filtering:

#### Indexes
- **Compound Indexes**:
  - `(species, adoptionStatus, shelterCity)`
  - `(size, energyLevel, goodWithKids)`
  - `(species, size, gender, adoptionStatus, shelterCity)` for faceted search
- **Single Indexes**:
  - Trust score, popularity score
  - Urgency flags, creation date
  - Age, adoption fee, special needs
- **Geospatial Index**: 2dsphere for location-based queries
- **Text Search Index**: Full-text search on breed, personality, description

#### Features
- **Faceted Search**: Multi-dimensional filtering
- **Geographic Queries**: Find pets within distance radius
- **Popularity Scoring**: Based on views, favorites, applications
- **Urgency Scoring**: Priority for pets needing immediate adoption
- **Match Scoring**: Compatibility with user preferences

### 5. Services

#### ShelterVerificationService
- **Business Registration Verification**:
  - Integration with Korean government API
  - Checksum validation algorithm
  - Mock verification for development
- **Trust Management**:
  - Automatic trust score calculation
  - Fraud pattern detection
  - Suspension and reactivation workflows
- **Performance Tracking**:
  - Adoption outcome recording
  - Success rate calculation
  - Complaint management

#### PetMatchingService
- **AI-Powered Matching**:
  - Multi-factor compatibility scoring (0-100)
  - User preference analysis
  - Home environment assessment
- **Match Factors**:
  - Critical compatibility (kids, pets, experience level)
  - Home environment (size, yard, energy level)
  - Special needs consideration
  - Shelter trust score
  - Adoption fee budget
- **Specialized Queries**:
  - Beginner-friendly pets
  - Family-friendly pets
  - Urgent adoptions
- **Match Results Include**:
  - Match score (0-100)
  - Detailed match reasons
  - Warning flags for incompatibilities

#### AdoptionWorkflowService
- **Application Lifecycle**:
  1. Submission & validation
  2. Review & initial screening
  3. Interview scheduling & completion
  4. Home visit scheduling & evaluation
  5. Approval decision
  6. Adoption completion with contract
  7. Post-adoption follow-up
  8. Return tracking (if applicable)
- **Shelter Integration**: Updates shelter metrics automatically
- **Statistics**: Application processing metrics and success rates

## Database Schema

### PostgreSQL (TypeORM)
- **shelters**: Shelter information and verification status
- **pet_listings**: Pet details and adoption information
- **adoption_applications**: Application forms and workflow tracking

### MongoDB (Mongoose)
- **pet_listing_search**: Optimized search and faceted filtering

## API Endpoints

### Pet Matching & Search
```
GET  /adoption/match                   - Find pets matching preferences
GET  /adoption/beginner-friendly       - Get beginner-friendly pets
GET  /adoption/family-friendly         - Get family-friendly pets
GET  /adoption/urgent                  - Get urgent adoption listings
```

### Adoption Applications
```
POST /adoption/applications            - Submit new application
PUT  /adoption/applications/:id/review - Review application
PUT  /adoption/applications/:id/interview - Schedule interview
PUT  /adoption/applications/:id/interview/complete - Complete interview
PUT  /adoption/applications/:id/home-visit - Schedule home visit
PUT  /adoption/applications/:id/home-visit/complete - Complete home visit
PUT  /adoption/applications/:id/complete - Complete adoption
PUT  /adoption/applications/:id/return - Record return
GET  /adoption/applications/stats      - Get statistics
```

### Shelter Verification
```
POST /adoption/shelters/:id/verify     - Verify shelter
POST /adoption/shelters/:id/flag       - Flag suspicious activity
POST /adoption/shelters/:id/suspend    - Suspend shelter
POST /adoption/shelters/:id/reactivate - Reactivate shelter
POST /adoption/shelters/:id/complaint  - Add complaint
```

## Anti-Fraud Measures

### Shelter-Level Protection
1. **Business Registration Verification**: Government API integration
2. **Trust Score System**: Multi-factor reliability assessment
3. **Return Rate Monitoring**: Flag shelters with >30% return rate
4. **Complaint Tracking**: Automatic flagging after 5 complaints
5. **Auto-Suspension**: Critical complaints trigger immediate suspension
6. **Verification Status**: Pending, Verified, Rejected, Suspended

### Application-Level Protection
1. **Completeness Validation**: Minimum 80% completeness required
2. **Reference Checking**: Veterinary and personal references
3. **Home Visit Requirement**: Mandatory for high-risk adoptions
4. **Follow-up Tracking**: Post-adoption monitoring
5. **Return Documentation**: Track reasons and patterns

### System-Level Protection
1. **Deposit System**: Optional deposit for fraud prevention
2. **Suspicious Pattern Detection**: Automatic flagging algorithms
3. **Performance Metrics**: Real-time monitoring of shelter performance
4. **Geolocation Validation**: Prevent location spoofing

## Performance Optimizations

### Caching Strategy
- **Popular Pet Listings**: Cache frequently viewed listings (1 hour TTL)
- **Search Results**: Cache common search queries (30 minutes TTL)
- **Shelter Trust Scores**: Cache calculated scores (1 day TTL)
- **Facet Counts**: Cache filter counts (15 minutes TTL)

### Database Indexes
```sql
-- PostgreSQL Indexes
CREATE INDEX idx_shelters_verification ON shelters(verification_status, is_active);
CREATE INDEX idx_shelters_trust ON shelters(trust_score);
CREATE INDEX idx_listings_status ON pet_listings(shelter_id, adoption_status);
CREATE INDEX idx_listings_species ON pet_listings(species, adoption_status);
CREATE INDEX idx_applications_status ON adoption_applications(user_id, status);

-- MongoDB Indexes
db.pet_listing_search.createIndex({ species: 1, adoptionStatus: 1, shelterCity: 1 });
db.pet_listing_search.createIndex({ "location.coordinates": "2dsphere" });
db.pet_listing_search.createIndex({ searchText: "text" });
```

### Query Optimization
- **Hybrid Search**: MongoDB for fast filtering, PostgreSQL for detailed data
- **Denormalization**: Shelter info cached in MongoDB schema
- **Pagination**: Limit results to prevent large result sets
- **Lazy Loading**: Relations loaded only when needed
- **Batch Operations**: Bulk updates for efficiency

## Configuration

### Environment Variables
```env
# Business Verification API (Korean National Tax Service)
BUSINESS_VERIFICATION_API_URL=https://api.odcloud.kr/api/nts-businessman/v1/status
BUSINESS_VERIFICATION_API_KEY=your_api_key_here

# Cache Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/pet_to_you
```

### Business Registration API
Integration with Korean government API for business verification:
- **API Provider**: Open Data Portal (공공데이터포털)
- **Endpoint**: Business Status Inquiry API
- **Authentication**: API Key required
- **Rate Limit**: Check provider documentation
- **Fallback**: Mock verification for development/testing

## Usage Examples

### Find Matching Pets
```typescript
// Find family-friendly dogs
const matches = await petMatchingService.findMatches({
  species: [PetSpecies.DOG],
  goodWithKids: true,
  experienceLevel: 'beginner',
  location: {
    latitude: 37.5665,
    longitude: 126.978,
    maxDistance: 10000, // 10km
  },
}, 20);

// Each match includes:
// - listing: Full pet listing data
// - matchScore: 0-100 compatibility score
// - matchReasons: ["아이들과 잘 지냄", "초보자에게 적합", ...]
// - warnings: ["활동량이 높은 동물입니다", ...] (if any)
```

### Submit Adoption Application
```typescript
const application = await adoptionWorkflowService.submitApplication({
  petListingId: 'uuid',
  userId: 'uuid',
  applicantName: '홍길동',
  phoneNumber: '010-1234-5678',
  email: 'hong@example.com',
  homeType: HomeType.APARTMENT,
  address: '서울특별시 강남구...',
  // ... other fields
  adoptionReason: '반려동물과 함께 살고 싶어서...',
  agreedToTerms: true,
});
```

### Verify Shelter
```typescript
// Verify business registration
const shelter = await shelterVerificationService.verifyShelter(
  'shelter-uuid',
  'admin-user-id'
);

// Check verification result
if (shelter.verificationStatus === ShelterVerificationStatus.VERIFIED) {
  console.log(`Trust Score: ${shelter.trustScore}`);
  console.log(`Verified at: ${shelter.verifiedAt}`);
}
```

## Testing

### Unit Tests
- Business registration checksum validation
- Trust score calculation algorithms
- Match score computation
- Application completeness scoring

### Integration Tests
- Full application workflow (submit → approve → complete)
- Shelter verification with mock API
- Pet matching with various preferences
- MongoDB faceted search queries

### E2E Tests
- Complete adoption flow
- Fraud detection scenarios
- Search and filtering operations
- Return and complaint workflows

## Future Enhancements

1. **Machine Learning Integration**:
   - Advanced pet-human matching algorithms
   - Adoption success prediction models
   - Fraud detection ML models

2. **Advanced Features**:
   - Video interview support
   - AI-powered chatbot for application assistance
   - Automated follow-up reminders
   - Social sharing of pet listings

3. **Analytics**:
   - Shelter performance dashboards
   - Adoption trend analysis
   - User behavior insights
   - Success factor identification

4. **Integration**:
   - Government animal registration systems
   - Veterinary clinic networks
   - Pet insurance providers
   - Social media platforms

## License
Proprietary - Pet to You Platform
