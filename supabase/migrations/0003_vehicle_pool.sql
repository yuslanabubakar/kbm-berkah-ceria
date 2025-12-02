-- Vehicle pool per trip: decouple vehicles from legs and introduce link table

-- Create link table between legs and trip-level vehicles
CREATE TABLE IF NOT EXISTS public.leg_vehicle_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg_id UUID NOT NULL REFERENCES public.trip_legs(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.trip_vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(leg_id, vehicle_id)
);

ALTER TABLE public.leg_vehicle_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members view leg vehicles" ON public.leg_vehicle_links;
CREATE POLICY "members view leg vehicles" ON public.leg_vehicle_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND (
        t.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.participants p WHERE p.trip_id = t.id AND p.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "owners manage leg vehicles" ON public.leg_vehicle_links;
CREATE POLICY "owners manage leg vehicles" ON public.leg_vehicle_links
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

-- Copy existing vehicle-leg relationships into the new link table
INSERT INTO public.leg_vehicle_links (trip_id, leg_id, vehicle_id, created_at)
SELECT trip_id, leg_id, id, created_at
FROM public.trip_vehicles
WHERE leg_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop legacy foreign key and column tying vehicles to a single leg
ALTER TABLE public.trip_vehicles DROP CONSTRAINT IF EXISTS trip_vehicles_leg_id_fkey;
ALTER TABLE public.trip_vehicles DROP COLUMN IF EXISTS leg_id;
