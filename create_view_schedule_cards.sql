-- View: public.schedule_cards

create or replace view public.schedule_cards as
select
  d.brand_id,
  d.subcategory_id,
  d.scheduled_for,
  array_agg(distinct d.channel order by d.channel) as channels,
  min(d.publish_status) as representative_status,
  count(*) as channel_count,
  min(d.id) as any_draft_id
from public.drafts d
where d.schedule_source = 'framework'
group by d.brand_id, d.subcategory_id, d.scheduled_for;

grant select on public.schedule_cards to authenticated;


