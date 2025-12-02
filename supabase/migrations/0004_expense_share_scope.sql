-- Expense share scope refinements: allow leg-wide vs vehicle-only splits

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_share_scope') THEN
    CREATE TYPE public.expense_share_scope AS ENUM ('leg', 'vehicle');
  END IF;
END;
$$;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS share_scope public.expense_share_scope NOT NULL DEFAULT 'leg';

UPDATE public.expenses
  SET share_scope = 'leg'
  WHERE share_scope IS NULL;

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
leg_counts AS (
  SELECT
    leg_id,
    COUNT(DISTINCT participant_id) AS person_count
  FROM public.vehicle_assignments
  GROUP BY leg_id
),
vehicle_counts AS (
  SELECT
    leg_id,
    vehicle_id,
    COUNT(DISTINCT participant_id) AS person_count
  FROM public.vehicle_assignments
  GROUP BY leg_id, vehicle_id
),
auto_calc AS (
  SELECT
    e.id AS expense_id,
    va.participant_id,
    CASE
      WHEN e.share_scope = 'vehicle' AND e.vehicle_id IS NOT NULL THEN
        CASE WHEN vc.person_count = 0 THEN 0 ELSE e.amount_idr / vc.person_count END
      ELSE
        CASE WHEN lc.person_count = 0 THEN 0 ELSE e.amount_idr / lc.person_count END
    END AS share_amount
  FROM public.expenses e
  JOIN public.vehicle_assignments va
    ON va.leg_id = e.leg_id
   AND (
     e.share_scope = 'leg'
     OR (e.share_scope = 'vehicle' AND e.vehicle_id IS NULL)
     OR (e.share_scope = 'vehicle' AND va.vehicle_id = e.vehicle_id)
   )
  LEFT JOIN leg_counts lc ON lc.leg_id = e.leg_id
  LEFT JOIN vehicle_counts vc ON vc.leg_id = e.leg_id AND vc.vehicle_id = e.vehicle_id
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
