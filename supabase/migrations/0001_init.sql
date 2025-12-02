-- Clean slate
DROP VIEW IF EXISTS public.trip_balances;
DROP VIEW IF EXISTS public.expense_share_resolved;

DROP TABLE IF EXISTS public.trip_invites CASCADE;
DROP TABLE IF EXISTS public.settlements CASCADE;
DROP TABLE IF EXISTS public.expense_splits CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.vehicle_assignments CASCADE;
DROP TABLE IF EXISTS public.trip_vehicles CASCADE;
DROP TABLE IF EXISTS public.trip_legs CASCADE;
DROP TABLE IF EXISTS public.participants CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;

DROP TYPE IF EXISTS public.participant_role;
DROP TYPE IF EXISTS public.leg_type;
DROP TYPE IF EXISTS public.settlement_status;
DROP TYPE IF EXISTS public.trip_status;

-- Extensions & enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.trip_status AS ENUM ('draft', 'ongoing', 'settled', 'archived');
CREATE TYPE public.settlement_status AS ENUM ('pending', 'paid', 'void');
CREATE TYPE public.leg_type AS ENUM ('outbound', 'return', 'custom');
CREATE TYPE public.participant_role AS ENUM ('driver', 'passenger');

-- Trips master table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  origin_city TEXT,
  destination_city TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  start_date DATE,
  end_date DATE,
  status public.trip_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legs represent tiap arah perjalanan
CREATE TABLE public.trip_legs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg_order INTEGER NOT NULL,
  leg_type public.leg_type NOT NULL DEFAULT 'custom',
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  origin TEXT,
  destination TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, leg_order)
);

-- Peserta
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Kendaraan yang dipakai per leg
CREATE TABLE public.trip_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg_id UUID NOT NULL REFERENCES public.trip_legs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  plate_number TEXT,
  seat_capacity SMALLINT NOT NULL DEFAULT 7 CHECK (seat_capacity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Penugasan peserta ke kendaraan di setiap leg
CREATE TABLE public.vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leg_id UUID NOT NULL REFERENCES public.trip_legs(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.trip_vehicles(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  role public.participant_role NOT NULL DEFAULT 'passenger',
  allocation_override NUMERIC(8,3) CHECK (allocation_override IS NULL OR allocation_override >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(leg_id, participant_id, joined_at)
);

-- Pengeluaran selalu terikat ke leg tertentu
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  leg_id UUID NOT NULL REFERENCES public.trip_legs(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.trip_vehicles(id) ON DELETE SET NULL,
  paid_by UUID NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  expense_type TEXT DEFAULT 'lainnya',
  notes TEXT,
  amount_idr NUMERIC(14,2) NOT NULL CHECK (amount_idr > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manual override pembagian biaya
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  share_weight NUMERIC(8,3) NOT NULL DEFAULT 1 CHECK (share_weight > 0),
  share_amount_override NUMERIC(14,2) CHECK (share_amount_override IS NULL OR share_amount_override > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(expense_id, participant_id)
);

-- Settlement recommendation
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  from_participant UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  to_participant UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  amount_idr NUMERIC(14,2) NOT NULL CHECK (amount_idr > 0),
  status public.settlement_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Invite token
CREATE TABLE public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_participant UUID REFERENCES public.participants(id)
);

-- Helper function hitung bobot default per leg
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
      WHEN lt.total_people = 0 OR lt.total_vehicles = 0 THEN 0
      ELSE ((lt.total_people / lt.total_vehicles) / vc.people_in_vehicle) *
        CASE WHEN a.role = 'driver' THEN 0.5 ELSE 1 END
    END AS weight
  FROM assignments a
  JOIN vehicle_counts vc ON vc.leg_id = a.leg_id AND vc.vehicle_id = a.vehicle_id
  JOIN leg_totals lt ON lt.leg_id = a.leg_id;
$$ LANGUAGE sql STABLE;

-- View untuk gabungan share (manual override > auto)
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
  WHERE NOT EXISTS (SELECT 1 FROM public.expense_splits es WHERE es.expense_id = e.id)
)
SELECT * FROM manual
UNION ALL
SELECT * FROM auto_calc;

-- Trip balance view (total bayar vs total share)
CREATE OR REPLACE VIEW public.trip_balances AS
SELECT
  p.trip_id,
  p.id AS participant_id,
  p.display_name,
  COALESCE(SUM(CASE WHEN e.paid_by = p.id THEN e.amount_idr ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(esr.share_amount), 0) AS total_share,
  COALESCE(SUM(CASE WHEN e.paid_by = p.id THEN e.amount_idr ELSE 0 END), 0) -
    COALESCE(SUM(esr.share_amount), 0) AS balance_idr
FROM public.participants p
LEFT JOIN public.expenses e ON e.trip_id = p.trip_id
LEFT JOIN public.expense_share_resolved esr ON esr.expense_id = e.id AND esr.participant_id = p.id
GROUP BY p.trip_id, p.id, p.display_name;

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_updated
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Trip policies
CREATE POLICY "members view trips" ON public.trips
  FOR SELECT USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.participants p WHERE p.trip_id = id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "owners manage trips" ON public.trips
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Participants policies
CREATE POLICY "members view participants" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p2 WHERE p2.trip_id = trip_id AND p2.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "owners invite participants" ON public.participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

-- Trip leg policies
CREATE POLICY "members view legs" ON public.trip_legs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND (t.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.participants p WHERE p.trip_id = t.id AND p.user_id = auth.uid()
      ))
    )
  );

-- Vehicle policies
CREATE POLICY "members view vehicles" ON public.trip_vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND (t.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.participants p WHERE p.trip_id = t.id AND p.user_id = auth.uid()
      ))
    )
  );

-- Assignment policies
CREATE POLICY "members view assignments" ON public.vehicle_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.trip_id = (SELECT leg.trip_id FROM public.trip_legs leg WHERE leg.id = leg_id)
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = (SELECT leg.trip_id FROM public.trip_legs leg WHERE leg.id = leg_id)
        AND t.owner_id = auth.uid()
    )
  );

-- Expenses policies
CREATE POLICY "members view expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.trip_id = trip_id AND p.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.trips t WHERE t.id = trip_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "members insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participants p WHERE p.id = paid_by AND p.user_id = auth.uid()
    )
  );

-- Expense split policies
CREATE POLICY "members view splits" ON public.expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      JOIN public.participants p ON p.trip_id = e.trip_id
      WHERE e.id = expense_id AND p.user_id = auth.uid()
    )
  );

-- Settlement policies
CREATE POLICY "members view settlements" ON public.settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.trip_id = trip_id AND p.user_id = auth.uid()
    )
  );

-- Trip invite policies
CREATE POLICY "owner manage invites" ON public.trip_invites
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
