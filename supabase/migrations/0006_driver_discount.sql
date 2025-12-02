-- Recompute leg assignment weights so drivers receive a 50% discount per leg.
CREATE OR REPLACE FUNCTION public.compute_leg_assignment_weights(p_leg_id UUID)
RETURNS TABLE(participant_id UUID, weight NUMERIC) AS $$
  WITH assignments AS (
    SELECT
      va.participant_id,
      va.vehicle_id,
      va.role,
      va.allocation_override,
      va.leg_id
    FROM public.vehicle_assignments va
    WHERE va.leg_id = p_leg_id
  ),
  vehicle_counts AS (
    SELECT leg_id, vehicle_id, COUNT(*)::NUMERIC AS people_in_vehicle
    FROM assignments
    GROUP BY leg_id, vehicle_id
  ),
  leg_totals AS (
    SELECT leg_id, COUNT(DISTINCT vehicle_id)::NUMERIC AS total_vehicles, COUNT(*)::NUMERIC AS total_people
    FROM assignments
    GROUP BY leg_id
  )
  SELECT
    a.participant_id,
    CASE
      WHEN a.allocation_override IS NOT NULL THEN a.allocation_override
      WHEN lt.total_people = 0 OR lt.total_vehicles = 0 OR vc.people_in_vehicle = 0 THEN 0
      ELSE ((lt.total_people / NULLIF(lt.total_vehicles, 0)) / NULLIF(vc.people_in_vehicle, 0)) *
        CASE WHEN a.role = 'driver' THEN 0.5 ELSE 1 END
    END AS weight
  FROM assignments a
  JOIN vehicle_counts vc ON vc.leg_id = a.leg_id AND vc.vehicle_id = a.vehicle_id
  JOIN leg_totals lt ON lt.leg_id = a.leg_id;
$$ LANGUAGE sql STABLE;
