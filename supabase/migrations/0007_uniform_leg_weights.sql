-- Ensure leg-scoped expenses weigh everyone on the leg equally (drivers half-share)
CREATE OR REPLACE FUNCTION public.compute_leg_assignment_weights(p_leg_id UUID)
RETURNS TABLE(participant_id UUID, weight NUMERIC) AS $$
  WITH assignments AS (
    SELECT
      va.participant_id,
      va.role,
      va.allocation_override
    FROM public.vehicle_assignments va
    WHERE va.leg_id = p_leg_id
  )
  SELECT
    a.participant_id,
    CASE
      WHEN a.allocation_override IS NOT NULL THEN a.allocation_override
      WHEN a.role = 'driver' THEN 0.5
      ELSE 1
    END AS weight
  FROM assignments a;
$$ LANGUAGE sql STABLE;
