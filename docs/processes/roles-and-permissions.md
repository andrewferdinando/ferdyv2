# Roles and Permissions

## Overview

Ferdy uses a simplified two-tier permission system with roles at both the **Group level** (account-wide) and **Brand level** (per-brand). This allows for flexible team management, especially for marketing agencies managing multiple client brands.

**Philosophy:** Less is more. We keep roles simple and intuitive.

---

## Group-Level Roles

Group-level roles control access to account-wide features like billing, team management, and brand creation.

### Super Admin
**Database Value:** `super_admin`

**Who Has This:** Andrew (system owner) only

**Permissions:**
- Full system access
- Can see system-level debugging features
- All Admin permissions plus system tools

**Visibility:**
- Super Admin nav item only visible to super_admins
- Located at bottom of navigation
- Hidden from all other users

---

### Admin
**Database Value:** `admin`

**Who Has This:** Agency owners, account managers

**Permissions:**
- Can manage billing and subscriptions
- Can invite and remove team members
- Can create and delete brands
- Can access all brands in the Group
- Can modify Group settings

**Use Cases:**
- Agency owner managing the whole account
- Operations manager with full control
- Senior account manager

**UI Access:**
- Full access to Account section (Team, Billing, Brand Settings)
- Can create brands
- Can invite team members
- Can manage billing

---

### Member
**Database Value:** `member`

**Who Has This:** Team members, content creators, account coordinators

**Permissions:**
- Can only access brands they're explicitly assigned to
- **Cannot** invite team members
- **Cannot** create brands
- **Cannot** view or modify billing

**Use Cases:**
- Content creators working on specific client brands
- Social media managers assigned to certain accounts
- Junior team members with limited scope

**UI Restrictions:**
- No access to Team page
- No access to Add Brand
- No access to Billing page
- Only sees brands they're assigned to in brand switcher

---

## Brand-Level Roles

Brand-level roles control what users can do within a specific brand.

### Brand Admin
**Database Value:** `admin`

**Who Has This:** Account managers for specific clients, brand leads

**Permissions:**
- Full access to brand settings
- Can modify brand information (name, website, timezone)
- Can manage brand integrations (social media accounts)
- Can create, edit, and delete content
- Can manage categories and content library
- Can configure post times and copy length
- Can view and modify all brand data

**Use Cases:**
- Account manager responsible for a specific client
- Brand strategist leading a client account
- Senior team member managing a brand

**UI Access:**
- Full access to all brand pages
- Can modify settings in Engine Room
- Can manage integrations

---

### Brand Editor
**Database Value:** `editor`

**Who Has This:** Content creators, copywriters, social media coordinators

**Permissions:**
- Can create, edit, and delete content
- Can view brand settings (read-only)
- Can use integrations to publish
- Can manage content library
- **Cannot** modify brand settings
- **Cannot** modify integrations
- **Cannot** change schedule rules

**Use Cases:**
- Content creator focused on writing and scheduling
- Copywriter creating posts
- Social media coordinator managing day-to-day content

**UI Restrictions:**
- Engine Room settings are read-only or hidden
- Cannot modify integrations
- Cannot change brand information

---

## Permission Matrix

| Feature | Super Admin | Admin | Member | Brand Admin | Brand Editor |
|---------|-------------|-------|--------|-------------|--------------|
| **Group Level** |
| View Billing | ✅ | ✅ | ❌ | N/A | N/A |
| Manage Billing | ✅ | ✅ | ❌ | N/A | N/A |
| Invite Team Members | ✅ | ✅ | ❌ | N/A | N/A |
| Create Brands | ✅ | ✅ | ❌ | N/A | N/A |
| Delete Brands | ✅ | ✅ | ❌ | N/A | N/A |
| View All Brands | ✅ | ✅ | ❌ | N/A | N/A |
| System Tools | ✅ | ❌ | ❌ | N/A | N/A |
| **Brand Level** |
| View Brand | N/A | N/A | N/A | ✅ | ✅ |
| Edit Brand Settings | N/A | N/A | N/A | ✅ | ❌ |
| Manage Integrations | N/A | N/A | N/A | ✅ | ❌ |
| Create Content | N/A | N/A | N/A | ✅ | ✅ |
| Edit Content | N/A | N/A | N/A | ✅ | ✅ |
| Delete Content | N/A | N/A | N/A | ✅ | ✅ |
| Configure Categories | N/A | N/A | N/A | ✅ | ❌ |
| Configure Schedule | N/A | N/A | N/A | ✅ | ❌ |

---

## Role Assignment Workflows

### Inviting a New Team Member

1. Admin goes to `/account/team`
2. Clicks "Invite Team Member"
3. Enters email address
4. Selects **Group Role** (Admin or Member)
5. Selects which **brands** the user should access
6. For each brand, selects **Brand Role** (Admin or Editor)
7. Sends invitation

**Example 1: Account Manager**
- Email: `sarah@agency.com`
- Group Role: `Member`
- Brand Access:
  - "Acme Corp" → Brand Admin
  - "Beta Inc" → Brand Admin

**Result:** Sarah can manage settings and content for Acme Corp and Beta Inc, but cannot access billing or invite team members.

**Example 2: Content Creator**
- Email: `mike@agency.com`
- Group Role: `Member`
- Brand Access:
  - "Acme Corp" → Brand Editor
  - "Beta Inc" → Brand Editor
  - "Gamma LLC" → Brand Editor

**Result:** Mike can create and edit content for those 3 brands, but cannot change settings or manage billing.

**Example 3: Agency Partner**
- Email: `partner@agency.com`
- Group Role: `Admin`
- Brand Access: (automatically gets access to all brands)

**Result:** Partner can manage everything including billing, team, and all brands.

---

### Adding a New Brand

1. Admin goes to `/account/add-brand`
2. Fills in brand details (name, website, timezone)
3. Clicks "Create Brand"
4. Modal appears showing all team members
5. Selects which team members should have access
6. For each selected member, chooses Brand Role (Admin or Editor)
7. Clicks "Assign X Members" or "Skip for Now"

**Example:**
- New Brand: "Delta Designs"
- Assigned Team:
  - Sarah (Brand Admin)
  - Mike (Brand Editor)

**Result:** Sarah can manage Delta Designs settings, Mike can create content for it.

---

### Managing Existing Team Member Access

1. Admin goes to `/account/team`
2. Clicks on a team member
3. Views their current brand access
4. Toggles brands on/off
5. Changes roles for specific brands
6. Clicks "Save Changes"

**Use Cases:**
- Client project ends → remove access to that brand
- Team member promoted → change from Editor to Admin on key brands
- New client onboarded → add access to new brand

---

## Database Schema

### `profiles` table
Stores Group-level roles:
```sql
profiles (
  user_id uuid PRIMARY KEY,
  role text -- 'super_admin' | 'admin' | 'member'
)
```

### `group_memberships` table
Links users to Groups with Group-level role:
```sql
group_memberships (
  id uuid PRIMARY KEY,
  group_id uuid REFERENCES groups(id),
  user_id uuid REFERENCES auth.users(id),
  role text -- 'super_admin' | 'admin' | 'member'
)
```

### `brand_memberships` table
Links users to Brands with Brand-level role:
```sql
brand_memberships (
  id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands(id),
  user_id uuid REFERENCES auth.users(id),
  role text -- 'admin' | 'editor'
)
```

---

## Implementation Checklist

When implementing role-based access control, ensure:

### Frontend (Client-Side)
- [ ] Hide UI elements based on role
- [ ] Show "Admin only" badges where appropriate
- [ ] Disable buttons/forms for unauthorized roles
- [ ] Redirect unauthorized users to appropriate pages
- [ ] Hide "Super Admin" nav item from non-super-admins

### Backend (Server-Side)
- [ ] **Always** verify permissions in API routes
- [ ] **Always** verify permissions in Server Actions
- [ ] Check Group-level role for account operations
- [ ] Check Brand-level role for brand operations
- [ ] Return 403 Forbidden for unauthorized access

### Database (RLS)
- [ ] Row-Level Security policies enforce permissions
- [ ] Users can only see brands they have access to
- [ ] Group-level operations check `profiles.role`
- [ ] Brand-level operations check `brand_memberships.role`

---

## Code Examples

### Checking Group-Level Permission (Server Action)
```typescript
// src/app/(dashboard)/account/billing/actions.ts
export async function updateBillingAction() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check Group-level role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('You do not have permission to manage billing')
  }

  // Proceed with billing update...
}
```

### Checking Brand-Level Permission (API Route)
```typescript
// src/app/api/brands/[brandId]/settings/route.ts
export async function POST(request: Request, { params }: { params: { brandId: string } }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check Brand-level role
  const { data: membership } = await supabase
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', params.brandId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with settings update...
}
```

### Hiding UI Elements (Client Component)
```typescript
// src/app/(dashboard)/account/page.tsx
const [userRole, setUserRole] = useState<string | null>(null)

useEffect(() => {
  async function loadRole() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    setUserRole(profile?.role || null)
  }
  loadRole()
}, [])

const canManageBilling = userRole && ['admin', 'super_admin'].includes(userRole)
const isSuperAdmin = userRole === 'super_admin'

return (
  <>
    {canManageBilling && (
      <Link href="/account/billing">Billing</Link>
    )}
    
    {/* Only show to super admin */}
    {isSuperAdmin && (
      <Link href="/super-admin">System Tools</Link>
    )}
  </>
)
```

---

## Best Practices

1. **Keep It Simple**
   - Only 3 Group roles, 2 Brand roles
   - Clear distinction between account and brand permissions
   - Easy to explain to users

2. **Defense in Depth**
   - Check permissions on both client and server
   - Never trust client-side checks alone
   - Always verify in API routes and Server Actions

3. **Fail Secure**
   - Default to denying access
   - Explicitly grant permissions
   - Log unauthorized access attempts

4. **Clear Error Messages**
   - Tell users why they can't access something
   - Provide guidance on who to contact
   - Don't expose sensitive system details

5. **Consistent Naming**
   - Use exact database values in code (`super_admin`, not `superAdmin`)
   - Use display names only in UI (`Super Admin`)
   - Document all role values

---

## Troubleshooting

### User can't see a brand
- Check if they have a `brand_memberships` record for that brand
- Verify the brand's `group_id` matches their Group
- Ensure the brand hasn't been deleted
- Admins should see all brands automatically

### User can't invite team members
- Check their Group-level role in `profiles` table
- Ensure they have `admin` or `super_admin` role
- Members cannot invite others

### Permission denied errors
- Check both Group-level and Brand-level roles
- Verify RLS policies are enabled
- Check server-side permission checks in API routes
- Ensure role values match exactly (`admin` not `Admin`)

---

## Related Documentation

- [Team Management Process](./team-management.md)
- [Brand Creation Process](./brand-creation.md)
- [Billing Process](./billing.md)
- [Groups and Billing](./groups-and-billing.md)
