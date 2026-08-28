-- ==============================================================================
-- Nexa Health AI - Initial Database Schema & RLS Policies
-- Database: Supabase PostgreSQL (with pgvector & RLS)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Custom Types & Enums
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'admin',
    'doctor',
    'nurse',
    'front_desk',
    'billing',
    'patient',
    'lab_tech'
);

CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'checked_in',
    'in_consultation',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE appointment_type AS ENUM ('in_person', 'telehealth');
CREATE TYPE triage_level AS ENUM ('routine', 'urgent', 'emergency');
CREATE TYPE clinical_note_status AS ENUM ('draft', 'signed', 'amended');
CREATE TYPE lab_order_status AS ENUM ('ordered', 'sample_collected', 'processing', 'completed', 'cancelled');
CREATE TYPE prescription_status AS ENUM ('draft', 'signed', 'dispensed', 'cancelled');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'partially_paid', 'overdue', 'cancelled');
CREATE TYPE claim_status AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'settled');
CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE agent_task_status AS ENUM ('queued', 'running', 'completed', 'failed', 'requires_human_review');

-- 3. Utility Function: Timestamp updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- 4. Core User Profiles & Authentication
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Patients Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    mrn TEXT UNIQUE NOT NULL, -- Medical Record Number e.g. NX-2026-001
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    blood_group TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    allergies TEXT[] DEFAULT ARRAY[]::TEXT[],
    chronic_conditions TEXT[] DEFAULT ARRAY[]::TEXT[],
    insurance_provider TEXT,
    insurance_policy_number TEXT,
    insurance_group_number TEXT,
    living_summary TEXT, -- Autonomous AI living summary of health records
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_patients_modtime
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. Doctors & Schedules Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    license_number TEXT UNIQUE NOT NULL,
    specialization TEXT NOT NULL,
    department TEXT NOT NULL,
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 100.00,
    bio TEXT,
    rating NUMERIC(3,2) DEFAULT 5.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 7. Appointments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    date_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 30,
    type appointment_type NOT NULL DEFAULT 'in_person',
    status appointment_status NOT NULL DEFAULT 'scheduled',
    triage_level triage_level NOT NULL DEFAULT 'routine',
    reason TEXT NOT NULL,
    telehealth_room_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_appointments_modtime
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. Vitals & Clinical Notes Table (SOAP Architecture)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    heart_rate_bpm INT,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    respiratory_rate INT,
    temperature_celsius NUMERIC(4,2),
    oxygen_saturation_percent NUMERIC(4,1),
    weight_kg NUMERIC(5,2),
    height_cm NUMERIC(5,2),
    bmi NUMERIC(4,1),
    recorded_by UUID REFERENCES profiles(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    subjective TEXT NOT NULL,
    objective TEXT NOT NULL,
    assessment TEXT NOT NULL,
    plan TEXT NOT NULL,
    vitals_snapshot JSONB,
    icd10_codes JSONB DEFAULT '[]'::JSONB,
    ai_generated BOOLEAN NOT NULL DEFAULT false,
    ai_prompt_snippet TEXT,
    status clinical_note_status NOT NULL DEFAULT 'draft',
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_clinical_notes_modtime
BEFORE UPDATE ON clinical_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. Medications & E-Prescriptions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    category TEXT NOT NULL,
    form TEXT NOT NULL,
    strength TEXT NOT NULL,
    standard_dosage TEXT,
    contraindications TEXT[] DEFAULT ARRAY[]::TEXT[],
    side_effects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pharmacies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    is_open_24_hours BOOLEAN NOT NULL DEFAULT false,
    delivery_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    pharmacy_id UUID REFERENCES pharmacies(id) ON DELETE SET NULL,
    diagnosis TEXT NOT NULL,
    notes TEXT,
    status prescription_status NOT NULL DEFAULT 'draft',
    interaction_check_result JSONB,
    signed_at TIMESTAMPTZ,
    dispensed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medication_id UUID REFERENCES medications(id) ON DELETE SET NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    duration_days INT NOT NULL DEFAULT 7,
    instructions TEXT NOT NULL,
    warnings TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- ==============================================================================
-- 10. Laboratory Management
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    status lab_order_status NOT NULL DEFAULT 'ordered',
    clinical_notes TEXT,
    document_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_analysis JSONB,
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lab_test_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
    test_name TEXT NOT NULL,
    test_category TEXT NOT NULL,
    result_value TEXT,
    unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending'
);

-- ==============================================================================
-- 11. Billing, Invoices & Insurance Claims
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    insurance_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    patient_payable NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status invoice_status NOT NULL DEFAULT 'issued',
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    transaction_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    insurance_provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    claimed_amount NUMERIC(10,2) NOT NULL,
    approved_amount NUMERIC(10,2),
    status claim_status NOT NULL DEFAULT 'submitted',
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMPTZ
);

-- ==============================================================================
-- 12. Telehealth Sessions & WebRTC Signaling
-- ==============================================================================
CREATE TABLE IF NOT EXISTS telehealth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    room_id TEXT UNIQUE NOT NULL,
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    status TEXT NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    recording_consent_granted BOOLEAN NOT NULL DEFAULT false,
    chat_messages JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 13. Messages, Notifications & Medication Reminders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    channel TEXT NOT NULL DEFAULT 'in_app',
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    severity alert_severity NOT NULL DEFAULT 'medium',
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN NOT NULL DEFAULT false,
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medication_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    prescription_item_id UUID REFERENCES prescription_items(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    scheduled_time TIME NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 14. Digital Medical Records & Document Vault (with Vector Embeddings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    content_text TEXT,
    embedding vector(1536), -- Vector representation for medical semantic search / RAG
    version INT NOT NULL DEFAULT 1,
    file_url TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_medical_records_modtime
BEFORE UPDATE ON medical_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 15. Agent Framework: Tasks, Audit Logs & System Audits
-- ==============================================================================
CREATE TABLE IF NOT EXISTS agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    status agent_task_status NOT NULL DEFAULT 'queued',
    input_payload JSONB NOT NULL,
    reasoning_steps JSONB DEFAULT '[]'::JSONB,
    tool_calls JSONB DEFAULT '[]'::JSONB,
    output_result JSONB,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    is_approved BOOLEAN,
    approved_by UUID REFERENCES profiles(id),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    user_id UUID REFERENCES profiles(id),
    input_summary TEXT NOT NULL,
    output_summary TEXT NOT NULL,
    safety_check_passed BOOLEAN NOT NULL DEFAULT true,
    clinical_disclaimer TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL, -- e.g., 'READ_PATIENT_PHI', 'SIGN_PRESCRIPTION'
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 16. Row Level Security (RLS) Setup
-- ==============================================================================

-- Helper function to fetch current authenticated user role
CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE telehealth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS Policies: profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id OR get_auth_role() IN ('admin', 'super_admin'));

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id OR get_auth_role() IN ('admin', 'super_admin'));

CREATE POLICY "Admins full profile access"
    ON profiles FOR ALL
    USING (get_auth_role() IN ('admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- RLS Policies: patients
-- ------------------------------------------------------------------------------
CREATE POLICY "Clinical & admin staff can view all patients"
    ON patients FOR SELECT
    USING (get_auth_role() IN ('doctor', 'nurse', 'front_desk', 'billing', 'admin', 'super_admin', 'lab_tech'));

CREATE POLICY "Patients can view only their own patient record"
    ON patients FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Staff can insert and update patients"
    ON patients FOR ALL
    USING (get_auth_role() IN ('admin', 'super_admin', 'front_desk', 'doctor', 'nurse'));

-- ------------------------------------------------------------------------------
-- RLS Policies: appointments
-- ------------------------------------------------------------------------------
CREATE POLICY "Patients view their own appointments"
    ON appointments FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Doctors view their assigned appointments"
    ON appointments FOR SELECT
    USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

CREATE POLICY "Staff view and manage appointments"
    ON appointments FOR ALL
    USING (get_auth_role() IN ('admin', 'super_admin', 'front_desk', 'nurse', 'doctor'));

-- ------------------------------------------------------------------------------
-- RLS Policies: clinical_notes
-- ------------------------------------------------------------------------------
CREATE POLICY "Doctors and nurses view clinical notes"
    ON clinical_notes FOR SELECT
    USING (get_auth_role() IN ('doctor', 'nurse', 'admin', 'super_admin'));

CREATE POLICY "Doctors can create and update clinical notes"
    ON clinical_notes FOR ALL
    USING (get_auth_role() IN ('doctor', 'admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- RLS Policies: prescriptions
-- ------------------------------------------------------------------------------
CREATE POLICY "Patients view their own prescriptions"
    ON prescriptions FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Clinical staff view prescriptions"
    ON prescriptions FOR SELECT
    USING (get_auth_role() IN ('doctor', 'nurse', 'billing', 'admin', 'super_admin'));

CREATE POLICY "Doctors create prescriptions"
    ON prescriptions FOR ALL
    USING (get_auth_role() IN ('doctor', 'admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- RLS Policies: lab_orders
-- ------------------------------------------------------------------------------
CREATE POLICY "Patients view their completed labs"
    ON lab_orders FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Clinical & Lab staff manage labs"
    ON lab_orders FOR ALL
    USING (get_auth_role() IN ('doctor', 'nurse', 'lab_tech', 'admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- RLS Policies: invoices & insurance
-- ------------------------------------------------------------------------------
CREATE POLICY "Patients view their own invoices"
    ON invoices FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Billing and admin staff manage invoices"
    ON invoices FOR ALL
    USING (get_auth_role() IN ('billing', 'admin', 'super_admin'));

-- ------------------------------------------------------------------------------
-- RLS Policies: notifications & reminders
-- ------------------------------------------------------------------------------
CREATE POLICY "Users access own notifications"
    ON notifications FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Patients access own medication reminders"
    ON medication_reminders FOR ALL
    USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()) OR get_auth_role() IN ('nurse', 'doctor', 'admin'));
