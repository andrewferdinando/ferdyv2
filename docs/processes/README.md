# Ferdy Processes – Documentation Index

This folder contains the core architectural documents that explain how Ferdy automates social media posting, manages user accounts, and handles billing. If you are onboarding a developer or giving context to an AI coding assistant, **start here**.

---

## 📘 Reading Order (Recommended)

### **1. User Onboarding & Initial Setup**
`onboarding.md`
Details the 2-step wizard for new user registration, including account creation, brand setup, and Stripe subscription.

### **2. Sign-In and Authentication**
`sign-in.md`
Explains the sign-in process, including email/password authentication, social logins, and session management.

### **3. Password Reset**
`password-reset.md`
Outlines the secure process for resetting a user's password, including email verification and link generation.

### **4. Team Member Invitation**
`add-team-member.md`
Documents how to invite new and existing users to a brand, including the UI flow, authentication, and brand membership creation.

### **5. Brand Management**
`brand-management.md`
Covers the processes for adding and deleting brands, including the backend logic and security considerations.

### **6. Email Notifications**
`email-notifications.md`
Describes the triggers and implementation details for all email notifications sent by the application.

### **7. Category Creation**
`category_creation_flow.md`
Explains how a user defines content inputs for automation, including the 4-step wizard and asset/copy settings.

### **8. Schedule Rules**
`schedule_rules.md`
Defines how each category should post, including frequency, days, times, and channels.

### **9. Framework Targets (Posting Slots)**
`rpc_framework_targets.md`
Documents the SQL function that generates future posting timestamps for each schedule rule.

### **10. Push to Drafts (Automated & Manual)**
`push_to_drafts.md`
Explains how posting slots are converted into drafts, including the automated cron job and manual process.

### **11. Draft Lifecycle**
`draft_lifecycle.md`
Describes the journey of a draft from creation to publication, including status updates and post-job integration.

### **12. post_jobs & Publishing Engine**
`post_jobs_and_publishing_engine.md`
Defines the per-channel publishing mechanism, including job creation, processing, and success/failure handling.

---

## 📂 Process Overview (Quick Reference)

### **Account Management**
- **Onboarding**: New users are guided through a 2-step wizard to create an account, a brand, and a subscription.
- **Authentication**: Users can sign in with email/password or social logins. Sessions are managed by Supabase Auth.
- **Team Invitations**: Existing users can invite new or existing users to join a brand. Brand membership is granted upon acceptance.
- **Password Reset**: A secure process allows users to reset their password via an email link.

### **Content Automation**
- **Category Setup**: Users create categories to define content inputs for automation.
- **Scheduling**: Schedule rules determine when posts for each category are published.
- **Framework Generation**: A SQL function generates future posting timestamps based on the schedule rules.
- **Push to Drafts**: A cron job and manual process convert posting slots into drafts, generating copy and attaching assets.
- **Publishing**: A separate cron job processes due post jobs, publishing them to the appropriate social media channels.

---

## 💳 Billing & Account Management

### **Groups and Billing**
`groups-and-billing.md`
Documents the multi-tenant billing system, including group-based accounts, per-brand pricing, and subscription management.

### **Roles and Permissions**
`roles-and-permissions.md`
Provides a comprehensive guide to access control, including group-level and brand-level roles, a permissions matrix, and implementation guidelines.

---

## 🎨 Design & Brand Assets

### **Website Design Guide**
`website_design_guide.md`
Comprehensive design system documentation including brand identity, logo usage, typography, color palette, UI components, and illustration guidelines.

### **Hero Illustration Design**
`hero_illustration_design.md`
Process documentation for creating and maintaining hero illustrations, including design philosophy, visual structure, specifications, and version history.

### **Brand Assets**
`assets/`
Directory containing logo files and other brand assets:
- `ferdy_logo_transparent.png` - Full wordmark logo
- `ferdy_favicon_white.png` - Icon/favicon

---

## 🏗 Future Additions (Reserved)

- `copy_generation.md` (Deep dive into AI copy generation)
- `asset_selection.md` (Image rotation and asset tagging logic)
- `brand_settings.md` (Timezone, copy defaults, and brand personality)

---

## 🧭 How to Use This Folder

If you're a developer or AI agent working on Ferdy:

1.  Read the **Reading Order** section from top to bottom.
2.  When modifying a feature, update its corresponding documentation.
3.  Add new process documents as new automation paths are introduced.
4.  Treat this folder as a **source of truth** for backend behavior.

---

## 💡 Tip for AI Tools

When modifying or adding functionality, **always check how the change affects downstream processes**. For example, modifying `schedule_rules` will affect `framework_targets`, which in turn affects `push_to_drafts` and `publishing`. This dependency chain is the backbone of Ferdy's automation system.
