-- Host payment accounts for each trip
CREATE TYPE public.payment_account_channel AS ENUM ('bank', 'ewallet', 'cash', 'other');

CREATE TABLE public.host_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
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

CREATE INDEX idx_host_payment_accounts_trip ON public.host_payment_accounts (trip_id);

CREATE TRIGGER trg_host_payment_accounts_updated
  BEFORE UPDATE ON public.host_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.host_payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members view host accounts" ON public.host_payment_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND (
        t.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.participants p WHERE p.trip_id = trip_id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "owners manage host accounts" ON public.host_payment_accounts
  USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );
