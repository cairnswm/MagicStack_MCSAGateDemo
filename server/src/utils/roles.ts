export const GATE_CONTROLLER_ROLE = 'Gate Controller';
export const PROPERTY_OWNER_ROLE = 'Property Owner';
// Role names that grant full administration (compared case-insensitively).
export const ADMIN_ROLES = ['Administrator', 'Admin', 'System Administrator'];

export function normaliseRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => (typeof r === 'string' ? r : (r as { name?: string })?.name))
    .filter((r): r is string => typeof r === 'string');
}

export function isAdminRole(roles: string[]): boolean {
  const admin = ADMIN_ROLES.map((r) => r.toLowerCase());
  return roles.some((r) => admin.includes(r.toLowerCase()));
}

export function isGateControllerRole(roles: string[]): boolean {
  return roles.some((r) => r.toLowerCase() === GATE_CONTROLLER_ROLE.toLowerCase());
}

export function isPropertyOwnerRole(roles: string[]): boolean {
  return roles.some((r) => r.toLowerCase() === PROPERTY_OWNER_ROLE.toLowerCase());
}
