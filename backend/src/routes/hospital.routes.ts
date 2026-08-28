import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store';
import { AuthenticatedRequest, requireRole } from '../middleware/auth';
import { Hospital, HospitalType } from '../types/shared';

const router = Router();

// Helper: Haversine distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// GET /api/hospitals/districts - List all 38 Tamil Nadu districts with hospital count
router.get('/districts', (_req: AuthenticatedRequest, res: Response) => {
  const districtsWithCount = store.tamilNaduDistricts.map((district) => {
    const count = store.hospitals.filter(
      (h) => h.district?.toLowerCase() === district.name.toLowerCase() && h.isActive !== false
    ).length;
    return {
      ...district,
      hospitalCount: count,
    };
  });

  res.json(districtsWithCount);
});

// GET /api/hospitals - List hospitals with multi-faceted search, district filtering, and geolocation distance
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const {
    search,
    district,
    city,
    hospitalType,
    specialization,
    department,
    emergencyOnly,
    lat,
    lng,
  } = req.query;

  let results = store.hospitals.filter((h) => h.isActive !== false);

  if (district && typeof district === 'string' && district !== 'all') {
    results = results.filter((h) => h.district?.toLowerCase() === district.toLowerCase());
  }

  if (city && typeof city === 'string' && city !== 'all') {
    results = results.filter((h) => h.city.toLowerCase() === city.toLowerCase());
  }

  if (hospitalType && typeof hospitalType === 'string' && hospitalType !== 'all') {
    results = results.filter((h) => h.hospitalType?.toLowerCase() === hospitalType.toLowerCase());
  }

  if (emergencyOnly === 'true') {
    results = results.filter((h) => h.emergencyAvailable === true);
  }

  if (specialization && typeof specialization === 'string' && specialization !== 'all') {
    results = results.filter((h) =>
      h.specializations.some((s) => s.toLowerCase().includes((specialization as string).toLowerCase()))
    );
  }

  if (department && typeof department === 'string' && department !== 'all') {
    results = results.filter((h) =>
      h.departments.some((d) => d.toLowerCase().includes((department as string).toLowerCase()))
    );
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.district && h.district.toLowerCase().includes(q)) ||
        h.city.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        (h.hospitalType && h.hospitalType.toLowerCase().includes(q)) ||
        h.specializations.some((s) => s.toLowerCase().includes(q)) ||
        h.departments.some((d) => d.toLowerCase().includes(q))
    );
  }

  // Calculate distance if patient GPS coordinates are provided
  let patientLat: number | null = null;
  let patientLng: number | null = null;
  if (lat && lng) {
    patientLat = parseFloat(lat as string);
    patientLng = parseFloat(lng as string);
  }

  // Populate doctors and attach distance
  let populated = results.map((hospital) => {
    const associatedDoctorIds = store.hospitalDoctors
      .filter((hd) => hd.hospitalId === hospital.id)
      .map((hd) => hd.doctorId);

    const doctors = store.doctors
      .filter((d) => associatedDoctorIds.includes(d.id) || d.hospitalId === hospital.id)
      .map((d) => {
        const user = store.users.find((u) => u.id === d.userId);
        return { ...d, user };
      });

    let distanceKm = undefined;
    if (patientLat !== null && patientLng !== null && !isNaN(patientLat) && !isNaN(patientLng)) {
      distanceKm = calculateDistance(patientLat, patientLng, hospital.latitude, hospital.longitude);
    }

    return {
      ...hospital,
      doctorsCount: doctors.length,
      doctors,
      distanceKm,
    };
  });

  // If distance calculated, sort nearest first
  if (patientLat !== null && patientLng !== null) {
    populated.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }

  res.json(populated);
});

// GET /api/hospitals/:id - Get specific hospital details
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const hospital = store.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  const associatedDoctorIds = store.hospitalDoctors
    .filter((hd) => hd.hospitalId === hospital.id)
    .map((hd) => hd.doctorId);

  const doctors = store.doctors
    .filter((d) => associatedDoctorIds.includes(d.id) || d.hospitalId === hospital.id)
    .map((d) => {
      const user = store.users.find((u) => u.id === d.userId);
      return { ...d, user };
    });

  res.json({
    ...hospital,
    doctorsCount: doctors.length,
    doctors,
  });
});

// GET /api/hospitals/:id/doctors - Get doctors roster for a hospital
router.get('/:id/doctors', (req: AuthenticatedRequest, res: Response) => {
  const hospitalId = req.params.id;
  const hospital = store.hospitals.find((h) => h.id === hospitalId);

  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  const associatedDoctorIds = store.hospitalDoctors
    .filter((hd) => hd.hospitalId === hospitalId)
    .map((hd) => hd.doctorId);

  const doctors = store.doctors
    .filter((d) => associatedDoctorIds.includes(d.id) || d.hospitalId === hospitalId)
    .map((d) => {
      const user = store.users.find((u) => u.id === d.userId);
      return { ...d, user, hospital };
    });

  res.json(doctors);
});

// POST /api/hospitals - Admin add new hospital
router.post('/', requireRole('admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    hospitalType = 'Multi-Speciality Hospital',
    district,
    districtId,
    address,
    city,
    state = 'Tamil Nadu',
    zipCode,
    phone,
    emergencyPhone,
    email,
    latitude,
    longitude,
    openingHours = '24 Hours Open',
    imageUrl,
    departments = ['General Medicine'],
    specializations = ['General Care'],
    facilities = ['Emergency Ward', 'Pharmacy'],
    totalBeds = 100,
    emergencyAvailable = true,
  } = req.body;

  if (!name || !district || !address || !city || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Name, district, address, city, latitude, and longitude are required' });
  }

  const newHospital: Hospital = {
    id: uuidv4(),
    name,
    hospitalType: hospitalType as HospitalType,
    district,
    districtId,
    address,
    city,
    state,
    zipCode,
    phone: phone || '+91 44 0000 0000',
    emergencyPhone: emergencyPhone || '108',
    email,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    openingHours,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
    departments,
    specializations,
    facilities,
    availableDoctorIds: [],
    totalBeds: parseInt(totalBeds as any) || 100,
    emergencyAvailable: Boolean(emergencyAvailable),
    rating: 4.80,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  store.hospitals.unshift(newHospital);
  res.status(201).json(newHospital);
});

// PUT /api/hospitals/:id - Admin update hospital
router.put('/:id', requireRole('admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const hospital = store.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  Object.assign(hospital, req.body, { updatedAt: new Date().toISOString() });
  res.json(hospital);
});

// DELETE /api/hospitals/:id - Admin deactivate hospital
router.delete('/:id', requireRole('admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const hospital = store.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  hospital.isActive = false;
  hospital.updatedAt = new Date().toISOString();
  res.json({ success: true, message: 'Hospital deactivated successfully' });
});

// POST /api/hospitals/:id/doctors - Admin assign doctor to hospital
router.post('/:id/doctors', requireRole('admin', 'super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const hospital = store.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) {
    return res.status(404).json({ error: 'Hospital not found' });
  }

  const { doctorId, department = 'General Medicine', isPrimary = true } = req.body;
  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId is required' });
  }

  const existing = store.hospitalDoctors.find((hd) => hd.hospitalId === hospital.id && hd.doctorId === doctorId);
  if (!existing) {
    store.hospitalDoctors.push({
      id: uuidv4(),
      hospitalId: hospital.id,
      doctorId,
      department,
      isPrimary,
    });
  }

  if (!hospital.availableDoctorIds?.includes(doctorId)) {
    hospital.availableDoctorIds = [...(hospital.availableDoctorIds || []), doctorId];
  }

  res.json({ success: true, hospital, assignedDoctorId: doctorId });
});

export default router;
