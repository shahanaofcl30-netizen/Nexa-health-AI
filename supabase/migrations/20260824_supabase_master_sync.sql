-- ==============================================================================
-- Nexa Health AI - Master Supabase PostgreSQL Database Schema & RLS Policies
-- Database: Supabase PostgreSQL (PostgREST / Auth / RLS)
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Enums & Custom Types
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

-- 3. Trigger Function for Updated Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- 4. User Profiles Table (Linked with Supabase Auth auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'patient',
    verification_status VARCHAR(20) DEFAULT 'approved',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was previously created
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'approved';

CREATE OR REPLACE TRIGGER update_profiles_modtime
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Tamil Nadu Districts Table (All 38 Official Districts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tamil_nadu_districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    state VARCHAR(50) NOT NULL DEFAULT 'Tamil Nadu',
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.tamil_nadu_districts (name, latitude, longitude) VALUES
('Ariyalur', 11.1400, 79.0786),
('Chengalpattu', 12.6841, 79.9836),
('Chennai', 13.0827, 80.2707),
('Coimbatore', 11.0168, 76.9558),
('Cuddalore', 11.7480, 79.7714),
('Dharmapuri', 12.1211, 78.1582),
('Dindigul', 10.3673, 77.9803),
('Erode', 11.3410, 77.7172),
('Kallakurichi', 11.7383, 78.9639),
('Kancheepuram', 12.8342, 79.7036),
('Karur', 10.9601, 78.0766),
('Krishnagiri', 12.5186, 78.2137),
('Madurai', 9.9252, 78.1198),
('Mayiladuthurai', 11.1075, 79.6522),
('Nagapattinam', 10.7672, 79.8449),
('Kanniyakumari', 8.0883, 77.5385),
('Namakkal', 11.2189, 78.1674),
('Perambalur', 11.2342, 78.8814),
('Pudukottai', 10.3833, 78.8001),
('Ramanathapuram', 9.3639, 78.8395),
('Ranipet', 12.9272, 79.3330),
('Salem', 11.6643, 78.1460),
('Sivaganga', 9.8433, 78.4809),
('Tenkasi', 8.9594, 77.3152),
('Thanjavur', 10.7870, 79.1378),
('Theni', 10.0104, 77.4768),
('Thoothukudi', 8.7642, 78.1348),
('Tiruchirappalli', 10.7905, 78.7047),
('Tirunelveli', 8.7139, 77.7567),
('Tirupathur', 12.4925, 78.5678),
('Tiruppur', 11.1085, 77.3411),
('Tiruvallur', 13.1432, 79.9079),
('Tiruvannamalai', 12.2253, 79.0747),
('Tiruvarur', 10.7725, 79.6365),
('Vellore', 12.9165, 79.1325),
('Viluppuram', 11.9401, 79.4861),
('Virudhunagar', 9.5872, 77.9579),
('The Nilgiris', 11.4102, 76.6950)
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- 6. Hospitals Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    hospital_type VARCHAR(50) DEFAULT 'Multi-Speciality Hospital',
    district VARCHAR(100),
    district_id UUID REFERENCES public.tamil_nadu_districts(id) ON DELETE SET NULL,
    city TEXT NOT NULL,
    state TEXT DEFAULT 'Tamil Nadu',
    zip_code TEXT,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    emergency_phone TEXT,
    email TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    opening_hours TEXT NOT NULL DEFAULT '24/7 Emergency & Inpatient Care',
    departments TEXT[] DEFAULT ARRAY['Cardiology', 'Internal Medicine', 'Emergency Care', 'Pediatrics']::TEXT[],
    facilities TEXT[] DEFAULT ARRAY['24/7 Emergency', 'ICU', 'Inpatient Ward', 'Pharmacy', 'Diagnostic Lab']::TEXT[],
    image_url TEXT,
    total_beds INTEGER DEFAULT 250,
    emergency_available BOOLEAN DEFAULT true,
    rating DOUBLE PRECISION DEFAULT 4.9,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.tamil_nadu_districts(id) ON DELETE SET NULL;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS hospital_type VARCHAR(50) DEFAULT 'Multi-Speciality Hospital';
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS facilities TEXT[] DEFAULT ARRAY['24/7 Emergency', 'ICU', 'Pharmacy']::TEXT[];
ALTER TABLE public.hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE OR REPLACE TRIGGER update_hospitals_modtime
BEFORE UPDATE ON public.hospitals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Patients Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    mrn TEXT UNIQUE NOT NULL,
    full_name TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_group TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
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

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

CREATE OR REPLACE TRIGGER update_patients_modtime
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. Doctors Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    license_number TEXT UNIQUE NOT NULL,
    specialization TEXT NOT NULL,
    department TEXT DEFAULT 'General Medicine',
    qualification TEXT DEFAULT 'MBBS, MD',
    experience TEXT,
    experience_years INTEGER DEFAULT 10,
    consultation_fee NUMERIC(10, 2) DEFAULT 500.00,
    bio TEXT,
    avatar_url TEXT,
    rating DOUBLE PRECISION DEFAULT 4.9,
    verification_status VARCHAR(20) DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'approved';

CREATE OR REPLACE TRIGGER update_doctors_modtime
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. Hospital - Doctor Relationship Table (Many-to-Many)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hospital_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    department TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(hospital_id, doctor_id)
);

-- ==============================================================================
-- 10. Appointments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    appointment_date DATE,
    appointment_time TIME,
    date_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER DEFAULT 30,
    type VARCHAR(30) DEFAULT 'in_person',
    status VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    triage_level VARCHAR(30) DEFAULT 'routine',
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS appointment_time TIME;

CREATE OR REPLACE TRIGGER update_appointments_modtime
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 11. Prescriptions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    treatment_id UUID,
    prescription_date DATE DEFAULT CURRENT_DATE,
    instructions TEXT,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'signed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS treatment_id UUID;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS prescription_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS instructions TEXT;

CREATE OR REPLACE TRIGGER update_prescriptions_modtime
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 12. Prescription Items Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. Treatments Table (Clinical Consultations & Decision Support)
-- ==============================================================================
-- REQUIRES CLINICAL VALIDATION — NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT.
CREATE TABLE IF NOT EXISTS public.treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment_details TEXT NOT NULL,
    clinical_notes TEXT NOT NULL,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
    follow_up_date DATE,
    prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER update_treatments_modtime
BEFORE UPDATE ON public.treatments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 14. Medical Records Vault Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    record_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'General';
ALTER TABLE public.medical_records ADD COLUMN IF NOT EXISTS document_url TEXT;

-- ==============================================================================
-- 15. Pharmacies Table (Proximity Pharmacy Finder)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    district VARCHAR(100),
    city TEXT NOT NULL,
    state TEXT DEFAULT 'Tamil Nadu',
    zip_code TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    opening_hours TEXT DEFAULT '08:00 AM - 10:00 PM',
    is_open_24_hours BOOLEAN DEFAULT false,
    delivery_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE public.pharmacies ADD COLUMN IF NOT EXISTS opening_hours TEXT DEFAULT '08:00 AM - 10:00 PM';

-- ==============================================================================
-- 16. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON public.patients(mrn);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_hospital_id ON public.doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization);
CREATE INDEX IF NOT EXISTS idx_hospitals_district ON public.hospitals(district);
CREATE INDEX IF NOT EXISTS idx_hospitals_district_id ON public.hospitals(district_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_hospital_id ON public.hospital_doctors(hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_doctors_doctor_id ON public.hospital_doctors(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON public.appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_treatments_patient_id ON public.treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_doctor_id ON public.treatments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_treatments_hospital_id ON public.treatments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id ON public.prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacies_district ON public.pharmacies(district);

-- ==============================================================================
-- 17. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamil_nadu_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

-- Profiles: Users view/update their own profile; Admins view all
CREATE POLICY "Users access own profile" ON public.profiles FOR ALL USING (
    id = auth.uid() OR auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Public Directory Lookups: Districts, Hospitals, Doctors, Pharmacies
CREATE POLICY "Public read districts" ON public.tamil_nadu_districts FOR SELECT USING (true);
CREATE POLICY "Public read hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Public read hospital_doctors" ON public.hospital_doctors FOR SELECT USING (true);
CREATE POLICY "Public read approved doctors" ON public.doctors FOR SELECT USING (true);
CREATE POLICY "Public read pharmacies" ON public.pharmacies FOR SELECT USING (true);

-- Patients: Patient views only their own data
CREATE POLICY "Patient read own profile record" ON public.patients FOR SELECT USING (
    user_id = auth.uid() OR auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin', 'super_admin'))
);
CREATE POLICY "Patient update own profile record" ON public.patients FOR UPDATE USING (
    user_id = auth.uid() OR auth.role() = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Appointments: Patients view own; Doctors view assigned; Admins view all
CREATE POLICY "Appointments access policy" ON public.appointments FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'nurse', 'front_desk'))
);

-- Treatments: Patients view own; Doctors create/view assigned
CREATE POLICY "Treatments access policy" ON public.treatments FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Prescriptions & Items: Patients view own; Doctors manage assigned
CREATE POLICY "Prescriptions access policy" ON public.prescriptions FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Prescription items access policy" ON public.prescription_items FOR ALL USING (
    prescription_id IN (
        SELECT id FROM public.prescriptions 
        WHERE patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
        OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    )
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Medical Records: Patient views own; Doctors and Admins access permitted
CREATE POLICY "Medical records access policy" ON public.medical_records FOR ALL USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR auth.role() = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'nurse'))
);
