-- ==============================================================================
-- Nexa Health AI - Master Seed Data (Final Corrected v3)
-- Schema source: initial_schema.sql + complete_auth_system.sql
--               + hospital_treatment_flow.sql + supabase_master_sync.sql
-- Password for all logins: password123
-- ==============================================================================

-- ============================================================
-- TABLE ANALYSIS SUMMARY
-- ============================================================
-- medications       : id, name, generic_name, category, form, strength,
--                     standard_dosage, contraindications, side_effects
-- hospitals         : master_sync schema - district, hospital_type,
--                     facilities, emergency_phone, is_active columns present
-- auth.users        : insert first (FK parent of profiles)
-- profiles          : role ENUM = 'lab_tech' (initial_schema.sql created enum)
--                     full_name, verification_status added by later migrations
-- doctors           : user_id â†’ profiles.id, hospital_id, full_name, email,
--                     phone, qualification, experience TEXT, experience_years,
--                     verification_status
-- patients          : emergency_contact TEXT (combined), + _name/_phone/_relation
-- pharmacies        : district TEXT column exists (master_sync line 367)
-- appointments      : type/status/triage_level are VARCHAR in master_sync
--                     (plain strings, NOT strict ENUMs after master_sync ran)
-- treatments        : medicines JSONB NOT NULL DEFAULT '[]' (master_sync ln 326)
-- prescriptions     : NO diagnosis column in master_sync (ln 274-287)
--                     initial_schema has diagnosis NOT NULL â€” keep it safe:
--                     include diagnosis in case initial_schema ran first
-- prescription_items: duration TEXT (master_sync ln 307) NOT duration_days INT
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. MEDICATIONS
INSERT INTO public.medications
    (id, name, generic_name, category, form, strength, standard_dosage, contraindications, side_effects)
VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'Amoxicillin', 'Amoxicillin', 'Antibiotic', 'capsule', '500mg',
    '500mg every 8 hours for 7-10 days',
    ARRAY['Penicillin allergy', 'Mononucleosis'],
    ARRAY['Nausea', 'Diarrhea', 'Skin rash']
),
(
    '10000000-0000-0000-0000-000000000002',
    'Lisinopril', 'Lisinopril', 'Antihypertensive', 'tablet', '10mg',
    '10mg once daily in morning',
    ARRAY['Pregnancy', 'History of angioedema', 'Renal artery stenosis'],
    ARRAY['Dry cough', 'Dizziness', 'Hyperkalemia']
),
(
    '10000000-0000-0000-0000-000000000003',
    'Metformin', 'Metformin HCl', 'Antidiabetic', 'tablet', '500mg',
    '500mg twice daily with meals',
    ARRAY['Severe renal impairment', 'Metabolic acidosis'],
    ARRAY['Gastrointestinal upset', 'Nausea', 'Metallic taste']
),
(
    '10000000-0000-0000-0000-000000000004',
    'Atorvastatin', 'Atorvastatin Calcium', 'Statin', 'tablet', '20mg',
    '20mg once daily at bedtime',
    ARRAY['Active liver disease', 'Pregnancy'],
    ARRAY['Myalgia', 'Elevated liver transaminases', 'Headache']
),
(
    '10000000-0000-0000-0000-000000000005',
    'Albuterol Inhaler', 'Albuterol Sulfate', 'Bronchodilator', 'inhaler', '90mcg/actuation',
    '1-2 puffs every 4-6 hours PRN',
    ARRAY['Hypersensitivity to albuterol'],
    ARRAY['Tremors', 'Tachycardia', 'Nervousness']
),
(
    '10000000-0000-0000-0000-000000000006',
    'Warfarin', 'Warfarin Sodium', 'Anticoagulant', 'tablet', '5mg',
    '5mg once daily adjusted to target INR',
    ARRAY['Active bleeding', 'Pregnancy', 'Severe thrombocytopenia'],
    ARRAY['Bleeding risk', 'Bruising', 'Hematuria']
),
(
    '10000000-0000-0000-0000-000000000007',
    'Ibuprofen', 'Ibuprofen', 'NSAID', 'tablet', '400mg',
    '400mg every 6 hours with food',
    ARRAY['Active peptic ulcer', 'Severe heart failure', 'Aspirin allergy'],
    ARRAY['Gastric irritation', 'Heartburn', 'Fluid retention']
)
ON CONFLICT (id) DO NOTHING;

-- 2. HOSPITALS  (master_sync.sql schema â€” district, hospital_type, facilities, emergency_phone, is_active)
INSERT INTO public.hospitals
    (id, name, hospital_type, district, city, state, zip_code, address,
     phone, emergency_phone, email, latitude, longitude, opening_hours,
     departments, facilities, total_beds, emergency_available, rating, is_active)
VALUES
(
    '90000000-0000-0000-0000-000000000001',
    'Apollo Hospitals Greams Road', 'Multi-Speciality Hospital',
    'Chennai', 'Chennai', 'Tamil Nadu', '600006',
    '21 Greams Lane, Off Greams Road, Thousand Lights, Chennai',
    '+91 44 2829 0200', '1066', 'care@apollohealth.in',
    13.0604, 80.2496, '24/7 Emergency & Critical Care',
    ARRAY['Cardiology','Oncology','Neurology','Organ Transplant','Orthopedics','Robotic Surgery'],
    ARRAY['24/7 Emergency','Cardiovascular Cath Lab','Level-1 Trauma Center','PET-CT & 3T MRI','24/7 Pharmacy'],
    560, true, 4.96, true
),
(
    '90000000-0000-0000-0000-000000000002',
    'Rajiv Gandhi Government General Hospital', 'Government Hospital',
    'Chennai', 'Chennai', 'Tamil Nadu', '600003',
    'EVR Periyar Salai, Park Town, Chennai',
    '+91 44 2530 5000', '108', 'deanmmc@tn.gov.in',
    13.0802, 80.2778, '24/7 Emergency, Inpatient & Outpatient Care',
    ARRAY['General Medicine','General Surgery','Pediatrics','Nephrology','Cardiology','Neurology'],
    ARRAY['24/7 Free Emergency','NABH Accredited Trauma ICU','CMCHIS Coverage','24/7 Blood Bank'],
    2722, true, 4.85, true
),
(
    '90000000-0000-0000-0000-000000000003',
    'PSG Institute of Medical Sciences & Research', 'Multi-Speciality Hospital',
    'Coimbatore', 'Coimbatore', 'Tamil Nadu', '641004',
    'Avinashi Road, Peelamedu, Coimbatore',
    '+91 422 257 0170', '1066', 'info@psgimsr.ac.in',
    11.0267, 77.0028, '24/7 Emergency & Critical Care',
    ARRAY['Cardiology','Gastroenterology','Neurology','Pulmonology','Oncology','Orthopedics'],
    ARRAY['24/7 Emergency','Comprehensive Heart Center','Bone Marrow Transplant Unit','Pediatric ICU'],
    650, true, 4.92, true
),
(
    '90000000-0000-0000-0000-000000000004',
    'Government Rajaji Hospital & Medical College', 'Government Hospital',
    'Madurai', 'Madurai', 'Tamil Nadu', '625020',
    'Panagal Road, Shenoy Nagar, Madurai',
    '+91 452 253 2535', '108', 'deangrh@tn.gov.in',
    9.9328, 78.1328, '24/7 Emergency & Inpatient Services',
    ARRAY['General Medicine','Pediatrics','Cardiology','Emergency Medicine','Nephrology'],
    ARRAY['24/7 Free Casualty','Super-Specialty Trauma Care','Advanced NICU','Free Pharmacy'],
    2518, true, 4.88, true
),
(
    '90000000-0000-0000-0000-000000000005',
    'Christian Medical College & Hospital (CMC)', 'Multi-Speciality Hospital',
    'Vellore', 'Vellore', 'Tamil Nadu', '632004',
    'Ida Scudder Road, Vellore',
    '+91 416 228 1000', '+91 416 228 2000', 'directorate@cmcvellore.ac.in',
    12.9249, 79.1352, '24/7 Emergency, Inpatient & Specialized Services',
    ARRAY['Neurology','Hematology','Endocrinology','Gastroenterology','Cardiology','Nephrology'],
    ARRAY['JCI & NABH Accredited','Bone Marrow Transplant Center','Clinical Genetics Unit','24/7 Emergency'],
    3000, true, 4.98, true
)
ON CONFLICT (id) DO NOTHING;

-- 3. AUTH USERS  (must be inserted BEFORE profiles â€” FK parent)
INSERT INTO auth.users
    (id, instance_id, aud, role, email, encrypted_password,
     email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','admin@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"super_admin"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','manager@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"admin"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','dr.chen@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"doctor"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','dr.ross@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"doctor"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','nurse.sarah@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"nurse"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','reception@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"front_desk"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','billing@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"billing"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','labtech@nexahealth.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"lab_tech"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','emily.davis@patient.nexa.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"patient"}', NOW(), NOW()),

('30000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000000',
 'authenticated','authenticated','robert.j@patient.nexa.ai',
 crypt('password123', gen_salt('bf')), NOW(),
 '{"provider":"email","providers":["email"]}','{"role":"patient"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. PROFILES
-- NOTE: role ENUM value 'lab_tech' â€” defined in initial_schema.sql (ran first)
-- NOTE: full_name and verification_status columns added by later migrations
INSERT INTO public.profiles
    (id, email, role, first_name, last_name, full_name, phone, verification_status, is_active)
VALUES
('30000000-0000-0000-0000-000000000001','admin@nexahealth.ai',      'super_admin','Eleanor',  'Vance',  'Dr. Eleanor Vance', '+91 98400 10001','approved',true),
('30000000-0000-0000-0000-000000000002','manager@nexahealth.ai',    'admin',      'Marcus',   'Thorne', 'Marcus Thorne',     '+91 98400 10002','approved',true),
('30000000-0000-0000-0000-000000000003','dr.chen@nexahealth.ai',    'doctor',     'Sophia',   'Chen',   'Dr. Sophia Chen',   '+91 98400 10003','approved',true),
('30000000-0000-0000-0000-000000000004','dr.ross@nexahealth.ai',    'doctor',     'Alexander','Ross',   'Dr. Alexander Ross','+91 98400 10004','approved',true),
('30000000-0000-0000-0000-000000000005','nurse.sarah@nexahealth.ai','nurse',      'Sarah',    'Jenkins','Sarah Jenkins',     '+91 98400 10005','approved',true),
('30000000-0000-0000-0000-000000000006','reception@nexahealth.ai',  'front_desk', 'David',    'Kim',    'David Kim',         '+91 98400 10006','approved',true),
('30000000-0000-0000-0000-000000000007','billing@nexahealth.ai',    'billing',    'Rachel',   'Green',  'Rachel Green',      '+91 98400 10007','approved',true),
('30000000-0000-0000-0000-000000000008','labtech@nexahealth.ai',    'lab_tech',   'Kevin',    'Vance',  'Kevin Vance',       '+91 98400 10008','approved',true),
('30000000-0000-0000-0000-000000000009','emily.davis@patient.nexa.ai','patient',  'Emily',    'Davis',  'Emily Davis',       '+91 98400 10009','approved',true),
('30000000-0000-0000-0000-000000000010','robert.j@patient.nexa.ai', 'patient',   'Robert',   'Johnson','Robert Johnson',    '+91 98400 10010','approved',true)
ON CONFLICT (id) DO UPDATE SET
    email               = EXCLUDED.email,
    role                = EXCLUDED.role,
    first_name          = EXCLUDED.first_name,
    last_name           = EXCLUDED.last_name,
    full_name           = EXCLUDED.full_name,
    phone               = EXCLUDED.phone,
    verification_status = EXCLUDED.verification_status,
    is_active           = EXCLUDED.is_active,
    updated_at          = NOW();

-- 5. DOCTORS
INSERT INTO public.doctors
    (id, user_id, hospital_id, full_name, email, phone,
     license_number, specialization, department, qualification,
     experience, experience_years, consultation_fee, bio, rating, verification_status)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    '90000000-0000-0000-0000-000000000001',
    'Dr. Sophia Chen', 'dr.chen@nexahealth.ai', '+91 98400 10003',
    'TN-MCI-48291', 'Interventional Cardiology', 'Cardiovascular Sciences',
    'MD (MMC Chennai), DM (Cardiology), FACC',
    '16 years', 16, 800.00,
    'Senior Consultant Interventional Cardiologist at Apollo Hospitals Chennai.',
    4.96, 'approved'
),
(
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000004',
    '90000000-0000-0000-0000-000000000002',
    'Dr. Alexander Ross', 'dr.ross@nexahealth.ai', '+91 98400 10004',
    'TN-MCI-39102', 'Internal Medicine', 'General Medicine',
    'MD (General Medicine), FACP',
    '14 years', 14, 400.00,
    'Chief Medical Officer specializing in infectious diseases and chronic metabolic disorders at RGGGH Chennai.',
    4.88, 'approved'
)
ON CONFLICT (id) DO NOTHING;

-- 6. PATIENTS
INSERT INTO public.patients
    (id, user_id, mrn, full_name, first_name, last_name,
     date_of_birth, gender, blood_group, phone, email, address,
     emergency_contact, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
     allergies, chronic_conditions, living_summary)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000009',
    'NX-2026-001', 'Emily Davis', 'Emily', 'Davis',
    '1988-04-12', 'female', 'O+',
    '+91 98411 20001', 'emily.davis@patient.nexa.ai', 'Chennai, Tamil Nadu, India',
    'Mark Davis (+91 98411 20002)', 'Mark Davis', '+91 98411 20002', 'Spouse',
    ARRAY['Penicillin','Sulfa drugs'],
    ARRAY['Hypertension','Mild Asthma'],
    '38-year-old female with stage 1 essential hypertension and mild asthma. Controlled on Lisinopril 10mg. Penicillin allergy confirmed. BP 122/80 mmHg.'
),
(
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000010',
    'NX-2026-002', 'Robert Johnson', 'Robert', 'Johnson',
    '1965-11-23', 'male', 'A+',
    '+91 98411 20003', 'robert.j@patient.nexa.ai', 'Coimbatore, Tamil Nadu, India',
    'Linda Johnson (+91 98411 20004)', 'Linda Johnson', '+91 98411 20004', 'Spouse',
    ARRAY['Aspirin'],
    ARRAY['Type 2 Diabetes Mellitus','Hyperlipidemia'],
    '60-year-old male with Type 2 Diabetes Mellitus and hyperlipidemia. On Metformin 500mg and Atorvastatin 20mg.'
)
ON CONFLICT (id) DO NOTHING;

-- 7. PHARMACIES  (district TEXT column â€” master_sync ln 367)
INSERT INTO public.pharmacies
    (id, name, address, district, city, state, zip_code,
     phone, email, latitude, longitude, is_open_24_hours, delivery_available)
VALUES
(
    '20000000-0000-0000-0000-000000000001',
    'Apollo 24/7 Pharmacy - Greams Road',
    '21 Greams Road, Thousand Lights, Chennai',
    'Chennai', 'Chennai', 'Tamil Nadu', '600006',
    '+91 44 2829 3333', 'rx.greams@apollopharmacy.org',
    13.0608, 80.2501, true, true
),
(
    '20000000-0000-0000-0000-000000000002',
    'MedPlus Pharmacy - Anna Salai',
    '142 Mount Road, Anna Salai, Chennai',
    'Chennai', 'Chennai', 'Tamil Nadu', '600006',
    '+91 44 2855 1234', 'orders.annasalai@medplus.in',
    13.0585, 80.2530, true, true
),
(
    '20000000-0000-0000-0000-000000000003',
    'PSG Health 24/7 Pharmacy',
    'Avinashi Road, Peelamedu, Coimbatore',
    'Coimbatore', 'Coimbatore', 'Tamil Nadu', '641004',
    '+91 422 257 0180', 'rx@psghealth.org',
    11.0270, 77.0035, true, true
)
ON CONFLICT (id) DO NOTHING;

-- 8. APPOINTMENTS
-- type / status / triage_level are VARCHAR in master_sync (not strict ENUM)
-- so plain string values work regardless of which schema won
INSERT INTO public.appointments
    (id, patient_id, doctor_id, hospital_id,
     date_time, duration_minutes, type, status, triage_level, reason, notes)
VALUES
(
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '2026-08-24 14:00:00+00', 30, 'in_person', 'completed', 'routine',
    'Quarterly Hypertension & Cardiovascular Follow-up',
    'Patient reporting mild morning lightheadedness on current Lisinopril dosage.'
),
(
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000002',
    '2026-08-27 15:30:00+00', 30, 'telehealth', 'scheduled', 'routine',
    'Diabetes management and blood glucose review',
    'Telehealth session for HbA1c and blood glucose review.'
)
ON CONFLICT (id) DO NOTHING;

-- 9. TREATMENTS
-- medicines is JSONB NOT NULL DEFAULT '[]' â€” master_sync.sql line 326
-- Do NOT reference prescription_id yet (prescription inserted after)
INSERT INTO public.treatments
    (id, patient_id, doctor_id, hospital_id, appointment_id,
     symptoms, diagnosis, treatment_details, clinical_notes,
     medicines, follow_up_date)
VALUES
(
    '70000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'Mild morning dizziness and orthostatic lightheadedness. BP 138/88 mmHg on arrival. Denies chest pain.',
    'Essential (primary) hypertension Stage 1 (ICD-10 I10); Orthostatic hypotension - benign.',
    'Cardiovascular assessment completed. ECG: normal sinus rhythm. BP normalized to 122/80 mmHg after rest. Continue Lisinopril 10mg. Increase fluid intake.',
    'Penicillin allergy confirmed and documented. Patient advised gradual position changes. No medication changes at this visit.',
    '[{"name":"Lisinopril","dosage":"10mg","frequency":"Once daily morning","duration":"90 days"}]',
    '2026-09-24'
)
ON CONFLICT (id) DO NOTHING;

-- 10. PRESCRIPTIONS
-- master_sync.sql prescriptions table (ln 274-287) has NO diagnosis column
-- initial_schema.sql (ln 235) has diagnosis TEXT NOT NULL
-- Safe approach: include diagnosis â€” if column exists the insert works;
--   if it was dropped by master_sync CREATE TABLE IF NOT EXISTS the column
--   was already there from initial_schema so it still exists with NOT NULL.
INSERT INTO public.prescriptions
    (id, patient_id, doctor_id, hospital_id, appointment_id,
     treatment_id, diagnosis, prescription_date, instructions, notes, status)
VALUES
(
    '80000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'Essential (primary) hypertension, Stage 1 (ICD-10 I10)',
    CURRENT_DATE,
    'Take Lisinopril 10mg once daily in the morning with water. Do not skip doses.',
    'Refill 90-day supply authorized with 3 refills. Monitor BP weekly.',
    'signed'
)
ON CONFLICT (id) DO NOTHING;

-- 11. PRESCRIPTION ITEMS
-- duration is TEXT in master_sync.sql line 307 (NOT duration_days INTEGER)
INSERT INTO public.prescription_items
    (prescription_id, medication_name, dosage, frequency, duration, instructions)
VALUES
(
    '80000000-0000-0000-0000-000000000001',
    'Lisinopril', '10mg', 'Once daily in morning', '90 days',
    'Take with a full glass of water every morning. Avoid potassium supplements unless directed by your doctor. Do not stop suddenly.'
)
ON CONFLICT DO NOTHING;
