-- Normalize existing post_jobs status/channel values and extend schema for publishing pipeline

-- Convert legacy published status to success before adjusting constraint
update post_jobs
set status = 'success'
where status = 'published';

alter table post_jobs
  drop constraint if exists post_jobs_status_check;

alter table post_jobs
  add constraint post_jobs_status_check
    check (status in ('pending','generated','ready','publishing','success','failed','canceled'));

-- Update channel constraint to reflect supported channels
alter table post_jobs
  drop constraint if exists post_jobs_channel_check;

alter table post_jobs
  add constraint post_jobs_channel_check
    check (channel in ('facebook','instagram_feed','instagram_story','linkedin_profile','tiktok','x'));

-- Migrate legacy channel names to the new canonical values
update post_jobs
set channel = 'instagram_feed'
where channel = 'instagram';

update post_jobs
set channel = 'linkedin_profile'
where channel = 'linkedin';

-- Extend post_jobs with draft linkage and publishing metadata
alter table post_jobs
  add column if not exists draft_id uuid references drafts(id) on delete cascade;

alter table post_jobs
  add column if not exists external_post_id text;

alter table post_jobs
  add column if not exists external_url text;

alter table post_jobs
  add column if not exists last_attempt_at timestamptz;

-- Backfill draft_id when drafts already reference a post_job
update post_jobs pj
set draft_id = d.id
from drafts d
where d.post_job_id = pj.id
  and pj.draft_id is null;

-- Helpful index for pipeline lookups
create index if not exists post_jobs_draft_channel_idx
  on post_jobs (draft_id, channel);

