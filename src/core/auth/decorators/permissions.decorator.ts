import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * 🔑 Permissions Decorator
 *
 * Restricts access based on fine-grained permissions.
 *
 * Permission Format: "resource:action"
 * Examples:
 * - "pet:read" - Read pet data
 * - "pet:write" - Create/update pets
 * - "pet:delete" - Delete pets
 * - "booking:approve" - Approve bookings
 * - "billing:refund" - Process refunds
 *
 * Usage:
 * ```typescript
 * @Permissions('pet:write')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @Post('pets')
 * createPet(@Body() createPetDto: CreatePetDto) {
 *   return this.petService.create(createPetDto);
 * }
 * ```
 *
 * Multiple permissions (AND logic):
 * ```typescript
 * // User must have both 'billing:read' AND 'billing:refund' permissions
 * @Permissions('billing:read', 'billing:refund')
 * @Post('refunds')
 * processRefund() {
 *   return { ... };
 * }
 * ```
 *
 * Note:
 * - Works with PermissionsGuard
 * - Requires JwtAuthGuard for authentication
 * - Uses AND logic for multiple permissions
 * - Permissions are mapped from user roles in PermissionsGuard
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
