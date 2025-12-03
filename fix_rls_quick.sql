-- Quick fix for RLS recursion - run this directly in Supabase SQL Editor
-- This fixes the infinite recursion by removing cross-table checks

BEGIN;

-- Drop ALL problematic policies
DROP POLICY IF EXISTS "members view trips" ON public.trips;
DROP POLICY IF EXISTS "owners manage trips" ON public.trips;
DROP POLICY IF EXISTS "members view participants" ON public.participants;
DROP POLICY IF EXISTS "owners invite participants" ON public.participants;
DROP POLICY IF EXISTS "members view legs" ON public.trip_legs;
DROP POLICY IF EXISTS "members view vehicles" ON public.trip_vehicles;
DROP POLICY IF EXISTS "members view assignments" ON public.vehicle_assignments;
DROP POLICY IF EXISTS "members view expenses" ON public.expenses;
DROP POLICY IF EXISTS "members insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "members view splits" ON public.expense_splits;
DROP POLICY IF EXISTS "members view settlements" ON public.settlements;
DROP POLICY IF EXISTS "owner manage invites" ON public.trip_invites;
DROP POLICY IF EXISTS "members view host accounts" ON public.host_payment_accounts;
DROP POLICY IF EXISTS "owners manage host accounts" ON public.host_payment_accounts;

-- Trips: Only owner can see and manage
CREATE POLICY "owners view trips" ON public.trips
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "owners manage trips" ON public.trips
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Participants: Owner can manage, anyone can see their own record
CREATE POLICY "view own participant" ON public.participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owners manage participants" ON public.participants
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Trip legs: Only owners
CREATE POLICY "owners access legs" ON public.trip_legs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Vehicles: Only owners
CREATE POLICY "owners access vehicles" ON public.trip_vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Assignments: Only owners
CREATE POLICY "owners access assignments" ON public.vehicle_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = (SELECT leg.trip_id FROM public.trip_legs leg WHERE leg.id = leg_id)
        AND t.owner_id = auth.uid()
    )
  );

-- Expenses: Only owners
CREATE POLICY "owners access expenses" ON public.expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Expense splits: Only owners
CREATE POLICY "owners access splits" ON public.expense_splits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.trips t ON t.id = e.trip_id
      WHERE e.id = expense_id AND t.owner_id = auth.uid()
    )
  );

-- Settlements: Only owners
CREATE POLICY "owners access settlements" ON public.settlements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Trip invites: Only owners
CREATE POLICY "owners manage invites" ON public.trip_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

-- Host payment accounts: Only owners
CREATE POLICY "owners manage host accounts" ON public.host_payment_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid())
  );

COMMIT;
