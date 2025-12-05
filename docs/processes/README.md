# Ferdy Processes – Documentation Index

This folder contains the core architectural documents that explain how Ferdy automates social media posting:

- how users define content (Categories)
- how schedules are defined (Schedule Rules)
- how the system generates posting slots (Framework Targets)
- how those slots become drafts (Push to Drafts)
- how drafts are turned into real social posts (post_jobs + Publishing Engine)

If you are onboarding a developer or giving context to an AI coding assistant, **start here**.

---

## 📘 Reading Order (Recommended)

### **1. Category Creation**
`categories.md`  
Explains how a user defines content inputs for automation.  
Covers the 4-step wizard, what gets saved to the `subcategories` table, and how assets & copy settings work.

### **2. Schedule Rules**
`schedule_rules.md`  
Defines how each category should post (frequency, days, times, timezone, channels).  
Created in the wizard and editable via the Schedule UI.

### **3. Framework Targets (Posting Slots)**
`framework_targets.md`  
Documents the `rpc_framework_targets` SQL function.  
Explains how Ferdy generates future posting timestamps for each schedule rule (daily/weekly/monthly/specific).

### **4. Push to Drafts (Automated & Manual)**
`push_to_drafts.md`  
Explains how posting slots become draft posts.  
Includes:
- manual Push to Drafts button  
- automated monthly pg_cron job  
- the `rpc_push_to_drafts_now` function  
- how assets and URLs are selected  
- saving drafts + generating copy

### **5. Draft Lifecycle**
`draft_lifecycle.md`  
Describes the full journey of a draft:
- created (framework/manual)
- edited
- approved
- scheduled
- eventually published or partially published  
Also covers how draft status is updated based on `post_jobs`.

### **6. post_jobs & Publishing Engine**
`post_jobs_publishing.md`  
Defines the per-channel publishing mechanism:
- how post_jobs are created
- how the publishing cron selects due jobs
- provider publishing flows
- success/failure handling
- how drafts get updated based on job results  

This is the document that controls how Ferdy actually **publishes** content.

---

## 📂 Process Overview (Quick Reference)

### **Category Setup**
- User creates categories via wizard.
- Saved to `subcategories` table.
- Includes copy length, URLs, details, default hashtags, assets, etc.

### **Scheduling**
- Every category has 1–N schedule rules.
- Schedule rules define *when* posts occur.
- Stored in `schedule_rules` table.

### **Framework Generation**
- `rpc_framework_targets` generates future posting timestamps.
- Handles daily/weekly/monthly/specific logic across timezones.

### **Push to Drafts**
- Runs monthly (pg_cron) and manually.
- Converts framework targets into real drafts.
- Generates copy, attaches assets, creates `post_jobs`.

### **Publishing**
- A 3rd-party cron hits `/api/publishing/run`.
- Publishing engine processes due `post_jobs`.
- Calls Meta/LinkedIn APIs per channel.
- Updates drafts accordingly.

---

## 🏗 Future Additions (Reserved)

These will be added as the system expands:

- `copy_generation.md`  
  (Deep dive into how the AI generates copy, variation hints, and subcategory context.)

- `asset_selection.md`  
  (Image rotation strategies, asset tagging logic, round-robin behaviour.)

- `brand_settings.md`  
  (Timezone, copy defaults, brand personality extraction.)

---

## 🧭 How to Use This Folder

If you're a developer or AI agent working on Ferdy:

1. Read the **Reading Order** top to bottom.
2. When touching a feature, update its corresponding doc.
3. Add new process docs as new automation paths are introduced.
4. Treat this folder as a **source of truth** for backend behaviour.

---

## 💡 Tip for AI Tools
When modifying or adding functionality:

> **Always check how the change affects downstream processes**  
> (e.g., modifying schedule_rules → affects framework targets → affects push to drafts → affects publishing).

This dependency chain is the backbone of Ferdy's automation system.

