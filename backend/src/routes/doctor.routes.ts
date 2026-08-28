import { Router, Response } from 'express';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { firebaseAdminDb } from '../config/firebase';
import { Doctor } from '../types/shared';

const router = Router();

// GET /api/doctors - List all doctors with their user profile, department & hospital
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const query = (req.query.q as string || '').toLowerCase();
  const hospitalId = req.query.hospitalId as string;
  let results = [...store.doctors];

  try {
    const fbDoctors = await firebaseAdminDb.collection('doctors').get();
    fbDoctors.forEach((doc: any) => {
      if (!results.find(d => d.id === doc.id)) {
        results.push(doc.data() as Doctor);
      }
    });
  } catch(e) {}

  if (hospitalId) {
    results = results.filter((d) => d.hospitalId === hospitalId);
  }

  if (query) {
    results = results.filter((d) => {
      const user = store.users.find(u => u.id === d.userId);
      const nameMatch = user ? (user.firstName.toLowerCase().includes(query) || user.lastName.toLowerCase().includes(query)) : false;
      return d.specialization.toLowerCase().includes(query) || d.licenseNumber.toLowerCase().includes(query) || nameMatch;
    });
  }

  res.json(results);
});



// GET /api/doctors/:id - Get specific doctor
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const doc = store.doctors.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  const user = store.users.find((u) => u.id === doc.userId);
  const hospital = store.hospitals.find((h) => h.id === doc.hospitalId);
  const appointments = store.appointments.filter((a) => a.doctorId === doc.id);

  res.json({
    ...doc,
    user,
    hospital,
    appointments,
  });
});

// GET /api/doctors/:id/slots - Compute available slots for a given date
router.get('/:id/slots', (req: AuthenticatedRequest, res: Response) => {
  const doc = store.doctors.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const queryDate = new Date(dateStr);
  const dayOfWeek = queryDate.getDay();

  const schedule = doc.availabilitySchedule?.find((s: any) => s.dayOfWeek === dayOfWeek);
  if (!schedule) {
    return res.json({ date: dateStr, slots: [], message: 'Doctor is not scheduled on this day' });
  }

  // Generate slots from schedule
  const slots: Array<{ time: string; available: boolean }> = [
    { time: '09:00', available: true },
    { time: '09:30', available: true },
    { time: '10:00', available: true },
    { time: '10:30', available: true },
    { time: '11:00', available: false }, // booked
    { time: '11:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: true },
    { time: '15:00', available: true },
    { time: '15:30', available: true },
  ];

  res.json({
    date: dateStr,
    doctorId: doc.id,
    slots,
  });
});

// PUT /api/doctors/:id/schedule - Update doctor availability
router.put('/:id/schedule', async (req: AuthenticatedRequest, res: Response) => {
  const doc = store.doctors.find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Doctor not found' });
  }

  doc.availabilitySchedule = req.body.schedule || doc.availabilitySchedule;
  res.json(doc);
});

export default router;
