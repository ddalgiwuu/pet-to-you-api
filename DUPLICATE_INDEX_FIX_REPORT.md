# Duplicate Index Fix Report

**Date**: 2026-01-24  
**Issue**: TypeORM duplicate index creation when both `unique: true` and `@Index([fieldName])` are defined

---

## Problem Description

TypeORM was creating duplicate indexes when both of these patterns were used on the same field:
1. Column decorator with `unique: true` constraint
2. Separate `@Index([fieldName])` decorator (either class-level or field-level)

This causes database errors because:
- `unique: true` automatically creates a unique index
- Additional `@Index()` decorators try to create redundant indexes

---

## Files Fixed

### 1. ✅ user.entity.ts (previously fixed)
**Field**: `email`
- Removed: Class-level `@Index(['email'], { unique: true })`
- Kept: Column-level `unique: true`

### 2. ✅ hospital.entity.ts
**Field**: `businessRegistrationNumber`
- **Location**: `/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/src/modules/hospitals/entities/hospital.entity.ts`
- **Changes**:
  - Removed: Class-level `@Index(['businessRegistrationNumber'], { unique: true })` (line 28)
  - Removed: Field-level `@Index()` decorator (line 65)
  - Kept: Column-level `unique: true` (line 64)
  - Added: Documentation comment explaining automatic index creation

### 3. ✅ shelter.entity.ts
**Field**: `businessRegistrationNumber`
- **Location**: `/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/src/modules/adoption/entities/shelter.entity.ts`
- **Changes**:
  - Removed: Class-level `@Index(['businessRegistrationNumber'], { unique: true })` (line 28)
  - Kept: Column-level `unique: true` (line 60)
  - Added: Documentation comment explaining automatic index creation

### 4. ✅ daycare-center.entity.ts
**Field**: `businessRegistrationNumber`
- **Location**: `/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/src/modules/daycare/entities/daycare-center.entity.ts`
- **Changes**:
  - Removed: Class-level `@Index(['businessRegistrationNumber'], { unique: true })` (line 35)
  - Removed: Field-level `@Index()` decorator (line 65)
  - Kept: Column-level `unique: true` (line 64)
  - Added: Documentation comment explaining automatic index creation

### 5. ✅ notification-template.entity.ts (Mongoose Schema)
**Field**: `templateId`
- **Location**: `/Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/src/modules/notifications/entities/notification-template.entity.ts`
- **Changes**:
  - Removed: `index: true` from `@Prop({ required: true, unique: true, index: true })` (line 27)
  - Removed: Manual index `NotificationTemplateSchema.index({ templateId: 1 }, { unique: true })` (line 201)
  - Kept: `@Prop({ required: true, unique: true })` - unique creates index automatically
  - Added: Documentation comment explaining automatic index creation

---

## Pattern Used for All Fixes

### Before (TypeORM):
```typescript
@Entity('table_name')
@Index(['fieldName'], { unique: true })  // ❌ DUPLICATE - Remove this
export class EntityName {
  @Column({ type: 'varchar', unique: true })
  @Index()  // ❌ DUPLICATE - Remove this
  fieldName: string;
}
```

### After (TypeORM):
```typescript
@Entity('table_name')
// Note: fieldName unique constraint creates index automatically (no duplicate @Index needed)
export class EntityName {
  // Note: unique: true creates index automatically - no need for duplicate @Index() decorator
  @Column({ type: 'varchar', unique: true })
  fieldName: string;
}
```

### Before (Mongoose):
```typescript
@Prop({ required: true, unique: true, index: true })  // ❌ index: true is duplicate
templateId: string;

// Later in file:
NotificationTemplateSchema.index({ templateId: 1 }, { unique: true });  // ❌ DUPLICATE
```

### After (Mongoose):
```typescript
// Note: unique: true creates index automatically - no need for duplicate index: true
@Prop({ required: true, unique: true })
templateId: string;

// Later in file:
// Note: templateId unique index already created by @Prop({ unique: true }) - no duplicate needed
```

---

## Best Practices Going Forward

### TypeORM Entities
1. **For unique fields**: Use only `unique: true` in Column decorator
   ```typescript
   @Column({ type: 'varchar', unique: true })
   fieldName: string;
   ```

2. **For non-unique indexed fields**: Use `@Index()` decorator
   ```typescript
   @Column({ type: 'varchar' })
   @Index()
   fieldName: string;
   ```

3. **For composite indexes**: Use class-level `@Index()` decorator
   ```typescript
   @Entity('table_name')
   @Index(['field1', 'field2'])
   export class EntityName { ... }
   ```

4. **For composite unique constraints**: Use class-level `@Index()` with `unique: true`
   ```typescript
   @Entity('table_name')
   @Index(['field1', 'field2'], { unique: true })
   export class EntityName { ... }
   ```

### Mongoose Schemas
1. **For unique fields**: Use only `unique: true` in @Prop decorator
   ```typescript
   @Prop({ required: true, unique: true })
   fieldName: string;
   ```

2. **For non-unique indexed fields**: Use `index: true` in @Prop decorator
   ```typescript
   @Prop({ required: true, index: true })
   fieldName: string;
   ```

3. **For compound indexes**: Use `SchemaName.index()` after schema creation
   ```typescript
   NotificationTemplateSchema.index({ field1: 1, field2: 1 });
   ```

---

## Verification Steps

To verify all duplicate indexes have been removed:

```bash
# Search for remaining duplicate patterns
grep -n "@Index()" src/modules/*/entities/*.entity.ts | grep -B2 "unique: true"

# Should return no results indicating duplicates on the same field
```

---

## Database Migration

After applying these fixes, you may need to:

1. **Drop duplicate indexes** (if they were already created):
   ```sql
   -- PostgreSQL example
   DROP INDEX IF EXISTS duplicate_index_name;
   ```

2. **Regenerate migrations** (if using TypeORM migrations):
   ```bash
   npm run migration:generate -- -n RemoveDuplicateIndexes
   ```

3. **Verify indexes** in the database:
   ```sql
   -- PostgreSQL example
   SELECT tablename, indexname, indexdef 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   AND tablename IN ('hospitals', 'shelters', 'daycare_centers', 'users');
   ```

---

## Impact Assessment

- **Performance**: ✅ Improved - Eliminates redundant index overhead
- **Database Size**: ✅ Reduced - Removes duplicate index storage
- **Functionality**: ✅ Maintained - All unique constraints still enforced
- **Breaking Changes**: ❌ None - Only removes redundant indexes

---

## Summary

**Total Files Fixed**: 5 entity files
- 1 TypeORM entity (user.entity.ts) - previously fixed
- 3 TypeORM entities (hospital, shelter, daycare-center) - fixed in this session
- 1 Mongoose schema (notification-template) - fixed in this session

**Total Fields Fixed**: 5 fields
- `User.email`
- `Hospital.businessRegistrationNumber`
- `Shelter.businessRegistrationNumber`
- `DaycareCenter.businessRegistrationNumber`
- `NotificationTemplate.templateId`

All duplicate index definitions have been removed while preserving unique constraints and proper indexing behavior.
