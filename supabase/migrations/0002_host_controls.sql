-- Host controls migration: expense exclusion + balance adjustments with logging

-- Add flag to exclude expenses from calculations
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT false;

-- Status enum for manual balance adjustments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'adjustment_status') THEN
    CREATE TYPE public.adjustment_status AS ENUM ('draft', 'applied', 'void');
  END IF;
END;
$$;

-- Manual balance adjustments table
CREATE TABLE IF NOT EXISTS public.balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  amount_idr NUMERIC(14,2) NOT NULL,
  reason TEXT,
  status public.adjustment_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ
);

ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members view adjustments" ON public.balance_adjustments;
CREATE POLICY "members view adjustments" ON public.balance_adjustments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.trip_id = trip_id AND p.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners insert adjustments" ON public.balance_adjustments;
CREATE POLICY "owners insert adjustments" ON public.balance_adjustments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners update adjustments" ON public.balance_adjustments;
CREATE POLICY "owners update adjustments" ON public.balance_adjustments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners delete adjustments" ON public.balance_adjustments;
CREATE POLICY "owners delete adjustments" ON public.balance_adjustments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

-- Refresh dependent views to account for the new flags & adjustments
DROP VIEW IF EXISTS public.trip_balances;
DROP VIEW IF EXISTS public.expense_share_resolved;

CREATE OR REPLACE VIEW public.expense_share_resolved AS
WITH manual AS (
  SELECT
    es.expense_id,
    es.participant_id,
    CASE
      WHEN es.share_amount_override IS NOT NULL THEN es.share_amount_override
      ELSE e.amount_idr * es.share_weight /
        NULLIF(SUM(es.share_weight) OVER (PARTITION BY es.expense_id), 0)
    END AS share_amount
  FROM public.expense_splits es
  JOIN public.expenses e ON e.id = es.expense_id
  WHERE e.is_excluded = false
),
auto_calc AS (
  SELECT
    e.id AS expense_id,
    weights.participant_id,
    CASE
      WHEN SUM(weights.weight) OVER (PARTITION BY e.id) = 0 THEN 0
      ELSE e.amount_idr * weights.weight / SUM(weights.weight) OVER (PARTITION BY e.id)
    END AS share_amount
  FROM public.expenses e
  JOIN LATERAL public.compute_leg_assignment_weights(e.leg_id) weights ON true
  WHERE e.is_excluded = false
    AND NOT EXISTS (SELECT 1 FROM public.expense_splits es WHERE es.expense_id = e.id)
)
SELECT * FROM manual
UNION ALL
SELECT * FROM auto_calc;

CREATE OR REPLACE VIEW public.trip_balances AS
WITH adjustment_totals AS (
  SELECT
    trip_id,
    participant_id,
    SUM(CASE WHEN status = 'applied' THEN amount_idr ELSE 0 END) AS adjustment_idr
  FROM public.balance_adjustments
  GROUP BY trip_id, participant_id
)
SELECT
  p.trip_id,
  p.id AS participant_id,
  p.display_name,
  COALESCE(SUM(CASE WHEN e.paid_by = p.id THEN e.amount_idr ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(esr.share_amount), 0) AS total_share,
  COALESCE(adj.adjustment_idr, 0) AS adjustment_idr,
  COALESCE(SUM(CASE WHEN e.paid_by = p.id THEN e.amount_idr ELSE 0 END), 0)
    - COALESCE(SUM(esr.share_amount), 0)
    + COALESCE(adj.adjustment_idr, 0) AS balance_idr
FROM public.participants p
LEFT JOIN public.expenses e
  ON e.trip_id = p.trip_id AND e.is_excluded = false
LEFT JOIN public.expense_share_resolved esr
  ON esr.expense_id = e.id AND esr.participant_id = p.id
LEFT JOIN adjustment_totals adj
  ON adj.trip_id = p.trip_id AND adj.participant_id = p.id
GROUP BY p.trip_id, p.id, p.display_name, adj.adjustment_idr;
