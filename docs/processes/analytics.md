# Super Admin Analytics — Ferdy

## Overview

The Analytics page provides internal visibility into app activity for super admins. It is a **read-only operational dashboard**, not customer-facing analytics.

**Route:** `/super-admin/analytics`  
**Access:** Super Admin only  
**Purpose:** Monitor app health, user engagement, and content publishing status

---

## Page Structure

The page uses a tabbed interface with 4 main sections:

1. **Posts Report** — Track scheduled, published, and missed posts
2. **Users – Last Login** — Identify active vs inactive users
3. **New User Invites** — Track onboarding activity
4. **Notifications Sent** — Audit system notifications

All tabs support pagination (20 items per page) and are designed for easy scanning.

---

## Tab 1: Posts Report

### Purpose
Track the status of all scheduled posts across brands to identify publishing issues.

### Filters
| Filter | Options | Description |
|--------|---------|-------------|
| Status | All / Scheduled / Published / Not published | Filter by post status |
| Date range | From → To | Filter by scheduled date |
| Brand | All / [Brand list] | Filter by specific brand |

### Table Columns
| Column | Description |
|--------|-------------|
| Brand | Brand name the post belongs to |
| Subcategory Type | Category type (e.g., "event", "product", "promo") |
| Subcategory Name | Specific subcategory name |
| Channels | Social channels (instagram_feed, facebook_page, etc.) |
| Scheduled Date | When the post was/is scheduled for |
| Status | Current status with color-coded badge |

### Status Logic
- **Scheduled** — `status = 'scheduled'` AND `scheduled_for >= now()`
- **Published** — `status = 'published'`
- **Not published** — `scheduled_for < now()` AND `status ≠ 'published'`

### Status Badges
| Status | Color | Meaning |
|--------|-------|---------|
| Published | Green | Successfully published |
| Scheduled | Blue | Scheduled for future |
| Draft | Gray | Not yet scheduled |
| Partial | Yellow | Some channels published |
| Failed | Red | Publishing failed |
| Not published | Red | Missed scheduled time |

### Data Source
- **Table:** `drafts`
- **Joins:** `brands`, `subcategories`

---

## Tab 2: Users – Last Login

### Purpose
Identify active vs inactive users to understand engagement and detect dormant accounts.

### Table Columns
| Column | Description |
|--------|-------------|
| User Name | Full name from profile |
| Email | User's email address |
| Brand(s) | All brands the user belongs to |
| Last Login | Date/time of most recent sign-in |
| Status | Activity status badge |

### Activity Status Logic
| Status | Criteria | Badge Color |
|--------|----------|-------------|
| Active | Last login ≤ 7 days ago | Green |
| Recent | Last login ≤ 30 days ago | Yellow |
| Inactive | Last login > 30 days ago | Red |
| Never | No login recorded | Gray |

### Ordering
Most recent login first (descending)

### Data Source
- **Table:** `profiles`
- **Joins:** `brand_memberships`, `brands`
- **Field:** `last_sign_in_at` (from Supabase auth metadata)

---

## Tab 3: New User Invites

### Purpose
Track onboarding activity and identify pending invitations.

### Table Columns
| Column | Description |
|--------|-------------|
| Brand | Brand the user was invited to |
| User Name | Invitee's name (if provided) |
| Email | Invitee's email address |
| Invite Sent Date | When the invitation was sent |
| Invite Status | Current status of the invitation |

### Invite Status Values
| Status | Badge Color | Meaning |
|--------|-------------|---------|
| Invited | Yellow | Pending acceptance |
| Accepted | Green | User has joined |
| Expired | Gray | Invitation expired |

### Ordering
Most recent first (by created_at descending)

### Data Source
- **Table:** `brand_invites`
- **Joins:** `brands`

---

## Tab 4: Notifications Sent

### Purpose
Audit system notifications for debugging and compliance.

### Current State
The `notification_logs` table has not been created yet. The tab displays a placeholder explaining this and lists all notification types that could be logged.

### Planned Table Columns
| Column | Description |
|--------|-------------|
| Date/Time Sent | When the notification was sent |
| Brand | Associated brand (if applicable) |
| Notification Type | Type of notification |
| Recipient | Email address of recipient |

### Notification Types
| Type | Description | Trigger |
|------|-------------|---------|
| `post_published` | Post successfully published | After publishing to social platform |
| `drafts_ready` | Monthly drafts ready for approval | After draft generator creates new drafts |
| `social_disconnected` | Social connection needs reconnection | Auth error during publishing |
| `brand_added` | New brand created | After brand creation |
| `brand_deleted` | Brand removed | After brand soft-delete |
| `team_invite` | User invited to brand | After team invite sent |
| `invoice_paid` | Payment confirmed | Stripe webhook |
| `password_reset` | Password reset requested | User request |

### Future Implementation
To enable notification logging:

1. Create `notification_logs` table:
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  notification_type TEXT NOT NULL,
  recipient_email TEXT,
  brand_id UUID REFERENCES brands(id),
  metadata JSONB
);
```

2. Update email sending functions in `/src/lib/emails/send.ts` to log each notification.

---

## Technical Architecture

### File Structure
```
src/app/(dashboard)/super-admin/analytics/
├── page.tsx                 # Main page with tab navigation
├── PostsReportTab.tsx       # Posts report component
├── UsersLastLoginTab.tsx    # Users last login component
├── NewUserInvitesTab.tsx    # User invites component
└── NotificationsSentTab.tsx # Notifications component
```

### Design Principles
1. **Read-only** — No actions or mutations
2. **Modular** — Each tab is a separate component for easy maintenance
3. **Reusable** — Uses existing Supabase tables and hooks
4. **Paginated** — 20 items per page to prevent performance issues
5. **Filterable** — Key filters for Posts Report tab
6. **Extensible** — Easy to add new tabs in the future

### Adding New Tabs
1. Create a new component in the analytics folder (e.g., `NewTabName.tsx`)
2. Import and add to the `tabs` array in `page.tsx`
3. Add conditional render in the tab content section
4. Update this documentation

---

## Access Control

The Analytics page is only accessible to super admins. Access is controlled by:
- Route-level middleware checking `is_super_admin` flag
- AppLayout component enforcing authentication

---

## Related Documentation

- [Draft Lifecycle](./draft_lifecycle.md) — Understanding post statuses
- [Email Notifications](./email-notifications.md) — Notification trigger details
- [User Roles](./user-roles.md) — Role-based access control
