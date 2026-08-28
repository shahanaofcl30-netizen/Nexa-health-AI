// Shared Domain Types & Enums for Nexa Health AI

export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'front_desk'
  | 'billing'
  | 'patient'
  | 'lab_tech';

export type AppointmentStatus = 
  | 'pending'
  | 'scheduled'
  | 'confirmed'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export type AppointmentType = 'in_person' | 'telehealth';

export type TriageLevel = 'routine' | 'urgent' | 'emergency';

export type ClinicalNoteStatus = 'draft' | 'signed' | 'amended';

export type LabOrderStatus = 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';

export type PrescriptionStatus = 'draft' | 'signed' | 'issued' | 'dispensed' | 'cancelled';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'settled';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AgentTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'requires_human_review';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  availabilitySchedule?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HospitalType =
  | 'Government Hospital'
  | 'Private Hospital'
  | 'Multi-Speciality Hospital'
  | 'Specialty Hospital'
  | 'Clinic'
  | 'Medical College Hospital'
  | 'Diagnostic Centre';

export interface TamilNaduDistrict {
  id: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  hospitalCount?: number;
}

export interface Hospital {
  id: string;
  name: string;
  hospitalType?: HospitalType;
  district?: string;
  districtId?: string;
  address: string;
  city: string;
  state?: string;
  zipCode?: string;
  phone: string;
  emergencyPhone?: string;
  email?: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  imageUrl?: string;
  departments: string[];
  specializations: string[];
  facilities?: string[];
  availableDoctorIds?: string[];
  consultationSlots?: string[];
  totalBeds?: number;
  emergencyAvailable?: boolean;
  rating?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HospitalDoctor {
  id: string;
  hospitalId: string;
  doctorId: string;
  department?: string;
  isPrimary?: boolean;
}

export interface Patient {
  id: string;
  userId?: string;
  mrn: string; // Medical Record Number (e.g. NX-2026-001)
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'undisclosed';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  allergies: string[]; // List of known allergies
  chronicConditions: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;
  livingSummary?: string; // AI generated patient summary
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  userId: string;
  hospitalId?: string;
  hospital?: Hospital;
  licenseNumber: string;
  specialization: string;
  department: string;
  qualification?: string;
  experienceYears?: number;
  consultationFee: number;
  bio?: string;
  avatarUrl?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  availabilitySchedule?: DoctorSchedule[];
  rating?: number;
  user?: UserProfile;
}

export interface DoctorSchedule {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  slotDurationMinutes: number; // e.g. 30
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  hospitalId: string;
  hospital?: Hospital;
  dateTime: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  triageLevel: TriageLevel;
  reason: string;
  telehealthRoomId?: string;
  notes?: string;
  patient?: Patient;
  doctor?: Doctor & { user?: UserProfile };
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentMedicine {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export interface Treatment {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId: string;
  appointmentId: string;
  symptoms: string;
  diagnosis: string;
  treatmentDetails: string;
  clinicalNotes: string;
  medicines: TreatmentMedicine[];
  followUpDate?: string;
  prescriptionId?: string;
  patient?: Patient;
  doctor?: Doctor & { user?: UserProfile };
  hospital?: Hospital;
  createdAt: string;
  updatedAt?: string;
}

export interface Vitals {
  heartRateBpm?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  respiratoryRate?: number;
  temperatureCelsius?: number;
  oxygenSaturationPercent?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  recordedAt: string;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string;
  appointmentId?: string;
  subjective: string; // Patient symptoms & history of present illness
  objective: string;  // Physical exam & vitals
  assessment: string; // Clinical diagnosis & differential diagnoses
  plan: string;       // Treatment, prescription, lab orders, follow-up
  vitals?: Vitals;
  icd10Codes: Array<{ code: string; description: string }>;
  aiGenerated: boolean;
  aiPromptSnippet?: string;
  status: ClinicalNoteStatus;
  signedAt?: string;
  signedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  genericName: string;
  category: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'inhaler' | 'topical';
  strength: string; // e.g. "500mg"
  standardDosage: string;
  contraindications: string[];
  sideEffects: string[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId?: string;
  medicationId?: string;
  medicationName: string;
  dosage: string; // e.g. "1 tablet"
  frequency: string; // e.g. "Twice daily after meals"
  durationDays: number;
  instructions: string;
  warnings?: string[];
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string;
  hospital?: Hospital;
  appointmentId?: string;
  treatmentId?: string;
  pharmacyId?: string;
  items: PrescriptionItem[];
  diagnosis: string;
  notes?: string;
  status: PrescriptionStatus;
  interactionCheckResult?: {
    hasInteractions: boolean;
    severity: 'none' | 'moderate' | 'severe';
    details: string[];
    // DISCLAIMER: Requires clinical validation, not a substitute for professional judgment
    clinicalDisclaimer: string;
  };
  signedAt?: string;
  dispensedAt?: string;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
  doctor?: Doctor & { user?: UserProfile };
}

export interface LabTestItem {
  id: string;
  testName: string;
  testCategory: string; // Hematology, Biochemistry, Radiology, etc.
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  status: 'pending' | 'completed';
}

export interface LabOrder {
  id: string;
  patientId: string;
  doctorId: string;
  hospitalId?: string;
  appointmentId?: string;
  tests: LabTestItem[];
  status: LabOrderStatus;
  clinicalNotes?: string;
  documentUrls?: string[];
  aiAnalysis?: {
    abnormalFindings: string[];
    plainLanguageSummary: string;
    suggestedFollowUp: string;
    generatedAt: string;
  };
  orderedAt: string;
  completedAt?: string;
  patient?: Patient;
  doctor?: Doctor & { user?: UserProfile };
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  category: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'room' | 'other';
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Invoice {
  id: string;
  patientId: string;
  hospitalId?: string;
  appointmentId?: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  items: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  insuranceDiscount: number;
  patientPayable: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: 'cash' | 'credit_card' | 'insurance' | 'bank_transfer' | 'online';
  transactionReference?: string;
  createdAt: string;
  patient?: Patient;
}

export interface InsuranceClaim {
  id: string;
  invoiceId: string;
  patientId: string;
  insuranceProvider: string;
  policyNumber: string;
  claimedAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  rejectionReason?: string;
  submittedAt: string;
  settledAt?: string;
}

export interface TelehealthSession {
  id: string;
  appointmentId: string;
  roomId: string;
  doctorId: string;
  patientId: string;
  status: 'waiting' | 'in_progress' | 'ended';
  startedAt?: string;
  endedAt?: string;
  recordingConsentGranted: boolean;
  chatMessages?: Array<{ sender: string; text: string; timestamp: string }>;
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  severity: AlertSeverity;
  source: 'vitals' | 'lab_result' | 'drug_interaction' | 'missed_medication' | 'system';
  title: string;
  message: string;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
  patient?: Patient;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  isOpen24Hours: boolean;
  deliveryAvailable: boolean;
  distanceKm?: number;
  openingHours?: string;
}

export interface MedicationReminder {
  id: string;
  patientId: string;
  prescriptionItemId?: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string; // e.g. "08:00"
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  notes?: string;
  takenAt?: string;
  date: string;
}

export interface AgentTask {
  id: string;
  agentName: string;
  status: AgentTaskStatus;
  inputPayload: Record<string, any>;
  reasoningSteps: string[];
  toolCalls: Array<{ tool: string; input: any; output: any; timestamp: string }>;
  outputResult?: Record<string, any>;
  requiresApproval: boolean;
  isApproved?: boolean;
  approvedBy?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AgentAuditLog {
  id: string;
  agentName: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  inputSummary: string;
  outputSummary: string;
  safetyCheckPassed: boolean;
  clinicalDisclaimer: string;
  timestamp: string;
}
