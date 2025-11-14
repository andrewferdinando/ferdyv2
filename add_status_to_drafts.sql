alter table drafts
  add column if not exists status text default 'draft';

update drafts
set status = 'draft'
where coalesce(status, '') = ''
  and approved = false;

update drafts
set status = 'scheduled'
where coalesce(status, '') = ''
  and approved = true;

