import { SetMetadata } from '@nestjs/common';

/**
 * 🔐 Permission Enumeration
 *
 * Fine-grained permissions for role-based access control (RBAC)
 * Format: {resource}:{action}
 */
export enum Permission {
  // Dashboard Permissions
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_EDIT = 'dashboard:edit',
  DASHBOARD_EXPORT = 'dashboard:export',

  // Pet Management
  PET_VIEW = 'pet:view',
  PET_CREATE = 'pet:create',
  PET_EDIT = 'pet:edit',
  PET_DELETE = 'pet:delete',
  PET_MEDICAL_VIEW = 'pet:medical:view',
  PET_MEDICAL_EDIT = 'pet:medical:edit',

  // Appointment Management
  APPOINTMENT_VIEW = 'appointment:view',
  APPOINTMENT_CREATE = 'appointment:create',
  APPOINTMENT_EDIT = 'appointment:edit',
  APPOINTMENT_CANCEL = 'appointment:cancel',
  APPOINTMENT_CONFIRM = 'appointment:confirm',
  APPOINTMENT_COMPLETE = 'appointment:complete',

  // Financial Operations
  REVENUE_VIEW = 'revenue:view',
  PAYMENT_VIEW = 'payment:view',
  PAYMENT_PROCESS = 'payment:process',
  REFUND_PROCESS = 'refund:process',
  INVOICE_GENERATE = 'invoice:generate',

  // Reviews & Ratings
  REVIEW_VIEW = 'review:view',
  REVIEW_RESPOND = 'review:respond',
  REVIEW_MODERATE = 'review:moderate',

  // Staff Management
  STAFF_VIEW = 'staff:view',
  STAFF_CREATE = 'staff:create',
  STAFF_EDIT = 'staff:edit',
  STAFF_DELETE = 'staff:delete',
  STAFF_PERMISSION_MANAGE = 'staff:permission:manage',

  // Business Operations
  SERVICE_VIEW = 'service:view',
  SERVICE_CREATE = 'service:create',
  SERVICE_EDIT = 'service:edit',
  SERVICE_DELETE = 'service:delete',

  BOOKING_VIEW = 'booking:view',
  BOOKING_CREATE = 'booking:create',
  BOOKING_EDIT = 'booking:edit',
  BOOKING_CANCEL = 'booking:cancel',

  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_EDIT = 'customer:edit',
  CUSTOMER_DELETE = 'customer:delete',

  // Analytics & Reporting
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',
  REPORT_GENERATE = 'report:generate',

  // System Administration
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',
  AUDIT_LOG_VIEW = 'audit:view',
}

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
export const Permissions = (...permissions: (Permission | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * 🗺️ Role-Permission Mapping
 *
 * Default permission sets for each role
 */
export const RolePermissions: Record<string, Permission[]> = {
  super_admin: Object.values(Permission),

  platform_admin: [
    Permission.DASHBOARD_VIEW,
    Permission.DASHBOARD_EDIT,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.AUDIT_LOG_VIEW,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_EDIT,
  ],

  hospital_admin: [
    Permission.DASHBOARD_VIEW,
    Permission.DASHBOARD_EDIT,
    Permission.DASHBOARD_EXPORT,
    Permission.PET_VIEW,
    Permission.PET_CREATE,
    Permission.PET_EDIT,
    Permission.PET_DELETE,
    Permission.PET_MEDICAL_VIEW,
    Permission.PET_MEDICAL_EDIT,
    Permission.APPOINTMENT_VIEW,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_EDIT,
    Permission.APPOINTMENT_CANCEL,
    Permission.APPOINTMENT_CONFIRM,
    Permission.APPOINTMENT_COMPLETE,
    Permission.REVENUE_VIEW,
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.REFUND_PROCESS,
    Permission.INVOICE_GENERATE,
    Permission.REVIEW_VIEW,
    Permission.REVIEW_RESPOND,
    Permission.REVIEW_MODERATE,
    Permission.STAFF_VIEW,
    Permission.STAFF_CREATE,
    Permission.STAFF_EDIT,
    Permission.STAFF_DELETE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REPORT_GENERATE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_EDIT,
  ],

  hospital_staff: [
    Permission.DASHBOARD_VIEW,
    Permission.PET_VIEW,
    Permission.PET_CREATE,
    Permission.PET_EDIT,
    Permission.PET_MEDICAL_VIEW,
    Permission.PET_MEDICAL_EDIT,
    Permission.APPOINTMENT_VIEW,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_EDIT,
    Permission.APPOINTMENT_CONFIRM,
    Permission.APPOINTMENT_COMPLETE,
    Permission.PAYMENT_VIEW,
    Permission.REVIEW_VIEW,
  ],

  daycare_admin: [
    Permission.DASHBOARD_VIEW,
    Permission.DASHBOARD_EDIT,
    Permission.SERVICE_VIEW,
    Permission.SERVICE_CREATE,
    Permission.SERVICE_EDIT,
    Permission.SERVICE_DELETE,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_EDIT,
    Permission.BOOKING_CANCEL,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_EDIT,
    Permission.REVENUE_VIEW,
    Permission.PAYMENT_VIEW,
    Permission.PAYMENT_PROCESS,
    Permission.REVIEW_VIEW,
    Permission.REVIEW_RESPOND,
    Permission.ANALYTICS_VIEW,
    Permission.SETTINGS_VIEW,
  ],

  shelter_admin: [
    Permission.DASHBOARD_VIEW,
    Permission.DASHBOARD_EDIT,
    Permission.SERVICE_VIEW,
    Permission.SERVICE_CREATE,
    Permission.SERVICE_EDIT,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.BOOKING_EDIT,
    Permission.CUSTOMER_VIEW,
    Permission.REVENUE_VIEW,
    Permission.PAYMENT_VIEW,
    Permission.REVIEW_VIEW,
    Permission.ANALYTICS_VIEW,
  ],

  consumer: [
    Permission.PET_VIEW,
    Permission.PET_CREATE,
    Permission.PET_EDIT,
    Permission.APPOINTMENT_VIEW,
    Permission.APPOINTMENT_CREATE,
    Permission.APPOINTMENT_CANCEL,
    Permission.BOOKING_VIEW,
    Permission.BOOKING_CREATE,
    Permission.PAYMENT_VIEW,
  ],
};

/**
 * Check if user has specific permission
 */
export function hasPermission(
  userRole: string,
  permission: Permission,
): boolean {
  const rolePermissions = RolePermissions[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: string): Permission[] {
  return RolePermissions[userRole] || [];
}
