-- ==============================================================================
-- Nexa Health AI - Hospital, Treatment, and Connected Healthcare Flow Migration
-- ==============================================================================

-- 1. Create Hospitals Table
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT DEFAULT 'CA',
    zip_code TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    opening_hours TEXT NOT NULL DEFAULT '24/7 Emergency & Inpatient Care',
    image_url TEXT,
    departments TEXT[] DEFAULT ARRAY['Cardiology', 'Internal Medicine', 'Emergency Care', 'Pediatrics']::TEXT[],
    specializations TEXT[] DEFAULT ARRAY['Cardiovascular Surgery', 'Diabetes & Endocrinology', 'General Medicine']::TEXT[],
    total_beds INTEGER DEFAULT 250,
    emergency_available BOOLEAN DEFAULT true,
    rating DOUBLE PRECISION DEFAULT 4.9,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_hospitals_modtime
BEFORE UPDATE ON hospitals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create Hospital Doctors Join Table
CREATE TABLE IF NOT EXISTS hospital_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    department TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hospital_id, doctor_id)
);

-- 3. Add hospital_id to doctors, appointments, clinical_notes, prescriptions, lab_orders, invoices
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualification TEXT DEFAULT 'MD, FACC';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 12;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE clinical_notes ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS treatment_id UUID;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- 4. Create Treatments Table (Consultations & Clinical Interventions)
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    treatment_details TEXT NOT NULL,
    clinical_notes TEXT NOT NULL,
    medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
    follow_up_date DATE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_treatments_modtime
BEFORE UPDATE ON treatments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. RLS Policies
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow admin manage hospitals" ON hospitals FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Allow public read on hospital_doctors" ON hospital_doctors FOR SELECT USING (true);

CREATE POLICY "Allow patient read their own treatments" ON treatments FOR SELECT USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('doctor', 'nurse', 'admin', 'super_admin'))
);

CREATE POLICY "Allow doctors create treatments" ON treatments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('doctor', 'admin', 'super_admin'))
);
