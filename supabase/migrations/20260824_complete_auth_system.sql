-- ==============================================================================
-- Nexa Health AI: Complete Supabase Authentication System Migration
-- Profiles, Patients, Doctors schema alignment, role enforcement & RLS policies
-- ==============================================================================

-- 1. Ensure User Role Enum exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin',
        'admin',
        'doctor',
        'nurse',
        'front_desk',
        'billing',
        'patient',
        'lab_technician'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table: Primary user profile linked with Supabase Auth auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'patient',
    verification_status VARCHAR(20) DEFAULT 'approved',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all required columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Doctors Table: Doctor credentials, clinical details & verification status
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID,
    doctor_id TEXT,
    license_number TEXT UNIQUE NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    specialization TEXT NOT NULL DEFAULT 'General Medicine',
    department TEXT DEFAULT 'General Medicine',
    qualification TEXT DEFAULT 'MBBS, MD',
    experience TEXT DEFAULT '5 years clinical practice',
    experience_years INTEGER DEFAULT 5,
    consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
    bio TEXT,
    avatar_url TEXT,
    rating DOUBLE PRECISION DEFAULT 4.9,
    verification_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist in doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS doctor_id TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT 'MBBS, MD';
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';

-- 4. Patients Table: Patient profile & medical identifiers
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    mrn TEXT UNIQUE NOT NULL,
    full_name TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL DEFAULT '1992-05-15',
    gender TEXT NOT NULL DEFAULT 'undisclosed',
    blood_group TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT DEFAULT 'Tamil Nadu, India',
    emergency_contact TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    living_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist in patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- 5. Indexes for fast lookup by role, email, doctor_id, license_number, MRN
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_license_number ON public.doctors(license_number);
CREATE INDEX IF NOT EXISTS idx_doctors_doctor_id ON public.doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctors_verification_status ON public.doctors(verification_status);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);

-- 6. Trigger to Prevent Unauthorized Role Tampering
-- Users CANNOT change their own role via client update
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only service_role or admin/super_admin can modify the role column
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF auth.role() <> 'service_role' THEN
            -- Check if the calling user is admin/super_admin
            IF NOT EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
            ) THEN
                RAISE EXCEPTION 'Unauthorized: Users cannot modify their own role.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- 7. Trigger to Auto-Create Profile on Supabase auth.users Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_role_val user_role;
    user_status VARCHAR(20);
BEGIN
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        SPLIT_PART(NEW.email, '@', 1)
    );
    
    -- Determine role from metadata or default to patient
    IF (NEW.raw_user_meta_data->>'role') = 'doctor' THEN
        user_role_val := 'doctor';
        user_status := 'pending';
    ELSE
        user_role_val := 'patient';
        user_status := 'approved';
    END IF;

    INSERT INTO public.profiles (
        id,
        user_id,
        email,
        full_name,
        first_name,
        last_name,
        phone,
        role,
        verification_status,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        user_full_name,
        SPLIT_PART(user_full_name, ' ', 1),
        SUBSTRING(user_full_name FROM LENGTH(SPLIT_PART(user_full_name, ' ', 1)) + 2),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        user_role_val,
        user_status,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users if permissions permit
DO $$ BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Skipping trigger on auth.users due to permission level.';
END $$;

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT USING (
    id = auth.uid() 
    OR user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'doctor', 'nurse'))
);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (
    id = auth.uid() 
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Doctors Policies
DROP POLICY IF EXISTS "Public can view approved doctors" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can view own doctor record" ON public.doctors;
DROP POLICY IF EXISTS "Doctors can update own doctor record" ON public.doctors;
DROP POLICY IF EXISTS "Admins manage all doctors" ON public.doctors;

CREATE POLICY "Public can view approved doctors" ON public.doctors
FOR SELECT USING (
    verification_status = 'approved'
    OR user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "Doctors can update own doctor record" ON public.doctors
FOR UPDATE USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Patients Policies
DROP POLICY IF EXISTS "Patients can view own record" ON public.patients;
DROP POLICY IF EXISTS "Patients can update own record" ON public.patients;
DROP POLICY IF EXISTS "Clinical staff can view patient records" ON public.patients;

CREATE POLICY "Patients can view own record" ON public.patients
FOR SELECT USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('doctor', 'nurse', 'admin', 'super_admin', 'front_desk', 'billing'))
);

CREATE POLICY "Patients can update own record" ON public.patients
FOR UPDATE USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);
