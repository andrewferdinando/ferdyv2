-- RPC wrapper around nextval() for the BCTI sequence.
-- supabase-js can't call sequence functions directly, so we expose it here.

CREATE OR REPLACE FUNCTION next_bcti_number()
RETURNS bigint
LANGUAGE sql
AS $$
  SELECT nextval('partner_bcti_number_seq');
$$;
