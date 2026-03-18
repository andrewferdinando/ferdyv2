// Group-level roles (group_memberships) — customer-facing
// super_admin is internal only (Andrew / system owner), hidden from customers.
export const GROUP_ROLES: Record<string, { label: string; color: string; description: string }> = {
  super_admin: {
    label: 'Group Owner',
    color: 'bg-purple-100 text-purple-800',
    description: 'Owns this group. Manages billing, team, and all brands.',
  },
  owner: {
    label: 'Group Owner',
    color: 'bg-purple-100 text-purple-800',
    description: 'Owns this group. Manages billing, team, and all brands. Can transfer ownership.',
  },
  admin: {
    label: 'Group Admin',
    color: 'bg-blue-100 text-blue-800',
    description: 'Can manage brands, team, and billing across the group.',
  },
  member: {
    label: 'Group Member',
    color: 'bg-gray-100 text-gray-700',
    description: 'Can access assigned brands only. Cannot manage billing or team.',
  },
}

// Brand-level roles (brand_memberships)
export const BRAND_ROLES: Record<string, { label: string; color: string; description: string }> = {
  admin: {
    label: 'Brand Admin',
    color: 'bg-teal-100 text-teal-800',
    description: "Can manage this brand's settings, integrations, and content.",
  },
  editor: {
    label: 'Brand Editor',
    color: 'bg-green-100 text-green-800',
    description: 'Can create and edit content for this brand.',
  },
}

const FALLBACK = { label: 'Unknown', color: 'bg-gray-100 text-gray-800', description: '' }

// Backward-compatible aliases
export const ACCOUNT_ROLES = GROUP_ROLES

export function getGroupRoleDisplay(role: string) {
  return GROUP_ROLES[role] ?? FALLBACK
}

// Backward-compatible alias
export const getAccountRoleDisplay = getGroupRoleDisplay

export function getBrandRoleDisplay(role: string) {
  return BRAND_ROLES[role] ?? FALLBACK
}

// Helper to check if a group role has admin-level access
export function isGroupAdminRole(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'super_admin'
}
