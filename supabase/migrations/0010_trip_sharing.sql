-- Add trip sharing functionality
-- Users can share their trips with other users for view-only access

BEGIN;

-- Create trip_shares table
CREATE TABLE IF NOT EXISTS public.trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS idx_trip_shares_trip ON public.trip_shares(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_user ON public.trip_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_email ON public.trip_shares(shared_with_email);

-- Enable RLS
ALTER TABLE public.trip_shares ENABLE ROW LEVEL SECURITY;

-- Helper function to check trip ownership without triggering recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.trip_is_owned_by(target_trip_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = target_trip_id AND t.owner_id = target_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.trip_is_owned_by(uuid, uuid) TO authenticated, service_role;

-- Helper function to retrieve current user's email without direct table access in policies
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_email() TO authenticated, service_role;

-- Trip shares policies: only owners can manage shares
DROP POLICY IF EXISTS "owners manage shares" ON public.trip_shares;
CREATE POLICY "owners manage shares" ON public.trip_shares
  FOR ALL USING (
    public.trip_is_owned_by(trip_id, auth.uid())
  )
  WITH CHECK (
    public.trip_is_owned_by(trip_id, auth.uid())
  );

-- Users can see shares directed to them
DROP POLICY IF EXISTS "view own shares" ON public.trip_shares;
CREATE POLICY "view own shares" ON public.trip_shares
  FOR SELECT USING (
    shared_with_user_id = auth.uid() 
    OR shared_with_email = public.current_user_email()
  );

-- Update trips policies to include shared users
DROP POLICY IF EXISTS "owners view trips" ON public.trips;
DROP POLICY IF EXISTS "owners and shared view trips" ON public.trips;
DROP POLICY IF EXISTS "owner view trips" ON public.trips;
DROP POLICY IF EXISTS "shared view trips" ON public.trips;

-- Simple owner-only view for trips to avoid recursion
CREATE POLICY "owner view trips" ON public.trips
  FOR SELECT USING (owner_id = auth.uid());

-- Separate policy for shared access (doesn't check trips table)
CREATE POLICY "shared view trips" ON public.trips
  FOR SELECT USING (
    id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

-- Update other policies to allow shared users to view (read-only)
DROP POLICY IF EXISTS "owners access legs" ON public.trip_legs;
DROP POLICY IF EXISTS "owners and shared view legs" ON public.trip_legs;
DROP POLICY IF EXISTS "owner view legs" ON public.trip_legs;
DROP POLICY IF EXISTS "shared view legs" ON public.trip_legs;
DROP POLICY IF EXISTS "owners manage legs" ON public.trip_legs;

CREATE POLICY "owner view legs" ON public.trip_legs
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );
CREATE POLICY "shared view legs" ON public.trip_legs
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage legs" ON public.trip_legs
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owners access vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "owners and shared view vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "owner view vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "shared view vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "owners manage vehicles" ON public.trip_vehicles;

CREATE POLICY "owner view vehicles" ON public.trip_vehicles
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );
CREATE POLICY "shared view vehicles" ON public.trip_vehicles
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage vehicles" ON public.trip_vehicles
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "view own participant" ON public.participants;
DROP POLICY IF EXISTS "owner view participants" ON public.participants;
DROP POLICY IF EXISTS "owners manage participants" ON public.participants;
DROP POLICY IF EXISTS "shared view participants" ON public.participants;
DROP POLICY IF EXISTS "owners and shared view participants" ON public.participants;

CREATE POLICY "view own participant" ON public.participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owner view participants" ON public.participants
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared view participants" ON public.participants
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage participants" ON public.participants
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owners access assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "owners and shared view assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "owner view assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "shared view assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "owners manage assignments" ON public.vehicle_assignments;

CREATE POLICY "owner view assignments" ON public.vehicle_assignments
  FOR SELECT USING (
    leg_id IN (
      SELECT id FROM public.trip_legs 
      WHERE trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "shared view assignments" ON public.vehicle_assignments
  FOR SELECT USING (
    leg_id IN (
      SELECT id FROM public.trip_legs 
      WHERE trip_id IN (
        SELECT trip_id FROM public.trip_shares 
        WHERE shared_with_user_id = auth.uid()
          OR shared_with_email = public.current_user_email()
      )
    )
  );

CREATE POLICY "owners manage assignments" ON public.vehicle_assignments
  FOR ALL USING (
    leg_id IN (
      SELECT id FROM public.trip_legs 
      WHERE trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners access expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners and shared view expenses" ON public.expenses;
DROP POLICY IF EXISTS "owner view expenses" ON public.expenses;
DROP POLICY IF EXISTS "shared view expenses" ON public.expenses;
DROP POLICY IF EXISTS "owners manage expenses" ON public.expenses;

CREATE POLICY "owner view expenses" ON public.expenses
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );
CREATE POLICY "shared view expenses" ON public.expenses
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage expenses" ON public.expenses
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owners access splits" ON public.expense_splits;
DROP POLICY IF EXISTS "owners and shared view splits" ON public.expense_splits;
DROP POLICY IF EXISTS "owner view splits" ON public.expense_splits;
DROP POLICY IF EXISTS "shared view splits" ON public.expense_splits;
DROP POLICY IF EXISTS "owners manage splits" ON public.expense_splits;

CREATE POLICY "owner view splits" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM public.expenses 
      WHERE trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
    )
  );
CREATE POLICY "shared view splits" ON public.expense_splits
  FOR SELECT USING (
    expense_id IN (
      SELECT id FROM public.expenses 
      WHERE trip_id IN (
        SELECT trip_id FROM public.trip_shares 
        WHERE shared_with_user_id = auth.uid()
          OR shared_with_email = public.current_user_email()
      )
    )
  );

DROP POLICY IF EXISTS "owners manage splits" ON public.expense_splits;
CREATE POLICY "owners manage splits" ON public.expense_splits
  FOR ALL USING (
    expense_id IN (
      SELECT id FROM public.expenses 
      WHERE trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "owners access settlements" ON public.settlements;
DROP POLICY IF EXISTS "owners and shared view settlements" ON public.settlements;
DROP POLICY IF EXISTS "owner view settlements" ON public.settlements;
DROP POLICY IF EXISTS "shared view settlements" ON public.settlements;
DROP POLICY IF EXISTS "owners manage settlements" ON public.settlements;

CREATE POLICY "owner view settlements" ON public.settlements
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared view settlements" ON public.settlements
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage settlements" ON public.settlements
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "owners manage host accounts" ON public.host_payment_accounts;
DROP POLICY IF EXISTS "owners and shared view host accounts" ON public.host_payment_accounts;
DROP POLICY IF EXISTS "owner view host accounts" ON public.host_payment_accounts;
DROP POLICY IF EXISTS "shared view host accounts" ON public.host_payment_accounts;

CREATE POLICY "owner view host accounts" ON public.host_payment_accounts
  FOR SELECT USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

CREATE POLICY "shared view host accounts" ON public.host_payment_accounts
  FOR SELECT USING (
    trip_id IN (
      SELECT trip_id FROM public.trip_shares 
      WHERE shared_with_user_id = auth.uid()
        OR shared_with_email = public.current_user_email()
    )
  );

CREATE POLICY "owners manage host accounts" ON public.host_payment_accounts
  FOR ALL USING (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM public.trips WHERE owner_id = auth.uid())
  );

COMMIT;
