BEGIN;

-- Master list of payment methods per user
CREATE TABLE public.user_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  channel public.payment_account_channel NOT NULL DEFAULT 'bank',
  provider TEXT,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  instructions TEXT,
  priority SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_payment_accounts_owner ON public.user_payment_accounts (owner_id);

CREATE TRIGGER trg_user_payment_accounts_updated
  BEFORE UPDATE ON public.user_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner view user payment accounts" ON public.user_payment_accounts
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owner manage user payment accounts" ON public.user_payment_accounts
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Attachments between trips and user payment methods
CREATE TABLE public.trip_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  payment_account_id UUID NOT NULL REFERENCES public.user_payment_accounts(id) ON DELETE CASCADE,
  custom_label TEXT,
  custom_instructions TEXT,
  custom_priority SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, payment_account_id)
);

CREATE INDEX idx_trip_payment_accounts_trip ON public.trip_payment_accounts (trip_id);
CREATE INDEX idx_trip_payment_accounts_payment ON public.trip_payment_accounts (payment_account_id);

CREATE TRIGGER trg_trip_payment_accounts_updated
  BEFORE UPDATE ON public.trip_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.trip_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner view trip payment accounts" ON public.trip_payment_accounts
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared view trip payment accounts" ON public.trip_payment_accounts
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage trip payment accounts" ON public.trip_payment_accounts
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

-- Data migration from legacy host_payment_accounts table
WITH source AS (
  SELECT
    h.id         AS legacy_id,
    h.trip_id,
    h.label,
    h.channel,
    h.provider,
    h.account_name,
    h.account_number,
    h.instructions,
    h.priority,
    h.created_at,
    h.updated_at,
    t.owner_id
  FROM public.host_payment_accounts h
  JOIN public.trips t ON t.id = h.trip_id
  WHERE t.owner_id IS NOT NULL
),
unique_user_accounts AS (
  SELECT DISTINCT ON (owner_id, channel, account_number, account_name, COALESCE(provider, ''))
    owner_id,
    label,
    channel,
    provider,
    account_name,
    account_number,
    instructions,
    priority,
    created_at,
    updated_at
  FROM source
  ORDER BY owner_id, channel, account_number, account_name, COALESCE(provider, ''), created_at
)
INSERT INTO public.user_payment_accounts (
  owner_id,
  label,
  channel,
  provider,
  account_name,
  account_number,
  instructions,
  priority,
  created_at,
  updated_at
)
SELECT
  owner_id,
  label,
  channel,
  provider,
  account_name,
  account_number,
  instructions,
  LEAST(priority, 100),
  created_at,
  updated_at
FROM unique_user_accounts;

WITH source AS (
  SELECT
    h.id         AS legacy_id,
    h.trip_id,
    h.label,
    h.channel,
    h.provider,
    h.account_name,
    h.account_number,
    h.instructions,
    h.priority,
    h.created_at,
    h.updated_at,
    t.owner_id
  FROM public.host_payment_accounts h
  JOIN public.trips t ON t.id = h.trip_id
  WHERE t.owner_id IS NOT NULL
)
INSERT INTO public.trip_payment_accounts (
  trip_id,
  payment_account_id,
  custom_label,
  custom_instructions,
  custom_priority,
  created_at,
  updated_at
)
SELECT
  s.trip_id,
  u.id,
  CASE WHEN u.label IS DISTINCT FROM s.label THEN s.label ELSE NULL END AS custom_label,
  CASE WHEN COALESCE(u.instructions, '') IS DISTINCT FROM COALESCE(s.instructions, '') THEN s.instructions ELSE NULL END AS custom_instructions,
  s.priority,
  s.created_at,
  s.updated_at
FROM source s
JOIN public.user_payment_accounts u
  ON u.owner_id = s.owner_id
 AND u.channel = s.channel
 AND u.account_number = s.account_number
 AND u.account_name = s.account_name
 AND COALESCE(u.provider, '') = COALESCE(s.provider, '');

DROP TABLE IF EXISTS public.host_payment_accounts;

COMMIT;
