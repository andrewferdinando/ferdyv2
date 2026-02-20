// Account-level roles (group_memberships) — customer-facing
// Both super_admin and admin render as "Account Owner" to customers.
// The distinction only matters internally.
export const ACCOUNT_ROLES: Record<string, { label: string; color: string; description: string }> = {
  super_admin: {
    label: 'Account Owner',
    color: 'bg-purple-100 text-purple-800',
    description: 'Manages billing, subscription, and all brands.',
  },
  admin: {
    label: 'Account Owner',
    color: 'bg-purple-100 text-purple-800',
    description: 'Manages billing, subscription, and all brands.',
  },
  member: {
    label: 'Team Member',
    color: 'bg-gray-100 text-gray-700',
    description: 'Part of the account.',
  },
}

// Brand-level roles (brand_memberships)
export const BRAND_ROLES: Record<string, { label: string; color: string; description: string }> = {
  admin: {
    label: 'Admin',
    color: 'bg-blue-100 text-blue-800',
    description: "Can manage this brand's team, settings, and content.",
  },
  editor: {
    label: 'Editor',
    color: 'bg-green-100 text-green-800',
    description: 'Can create and edit content for this brand.',
  },
}

const FALLBACK = { label: 'Unknown', color: 'bg-gray-100 text-gray-800', description: '' }

export function getAccountRoleDisplay(role: string) {
  return ACCOUNT_ROLES[role] ?? FALLBACK
}

export function getBrandRoleDisplay(role: string) {
  return BRAND_ROLES[role] ?? FALLBACK
}
