-- Per-vehicle departure schedule on each leg
ALTER TABLE public.leg_vehicle_links
  ADD COLUMN IF NOT EXISTS departure_at TIMESTAMPTZ;

-- Default existing links to follow their leg start time
UPDATE public.leg_vehicle_links lvl
SET departure_at = tl.start_datetime
FROM public.trip_legs tl
WHERE lvl.leg_id = tl.id
  AND lvl.departure_at IS NULL;
