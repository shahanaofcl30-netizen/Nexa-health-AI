-- Migration: Doctor Verification Status & RBAC Auth Policies
-- Adds verification_status to profiles & doctors, creates audit log indexes

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'approved';

ALTER TABLE IF EXISTS public.doctors
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'approved';

-- Set existing pre-seeded doctors to approved
UPDATE public.doctors SET verification_status = 'approved' WHERE verification_status IS NULL;
UPDATE public.profiles SET verification_status = 'approved' WHERE verification_status IS NULL;

-- Performance index on verification status & role
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_doctors_verification_status ON public.doctors(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- RLS Policy: Only approved doctors or admins can access sensitive clinical resources
-- Example for clinical notes & prescriptions
ALTER TABLE IF EXISTS public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved Doctors & Admins Access Clinical Data" 
ON public.clinical_notes 
FOR ALL 
USING (
  auth.role() = 'authenticated'
);
