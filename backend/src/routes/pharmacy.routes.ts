import { Router, Response } from 'express';
import { store } from '../db/store';
import { AuthenticatedRequest } from '../middleware/auth';

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

// GET /api/pharmacies - List pharmacies with hospital-based distance sorting & radius filter
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { hospitalId, radiusKm, open24Hours, deliveryOnly } = req.query;

  let originLat = store.hospitals[0]?.latitude || 13.0604; // Default to first Tamil Nadu hospital (Apollo Greams Road Chennai)
  let originLng = store.hospitals[0]?.longitude || 80.2514;
  let hospital = undefined;

  if (hospitalId && typeof hospitalId === 'string') {
    hospital = store.hospitals.find((h) => h.id === hospitalId);
    if (hospital) {
      originLat = hospital.latitude;
      originLng = hospital.longitude;
    }
  } else if (req.query.lat && req.query.lng) {
    originLat = parseFloat(req.query.lat as string);
    originLng = parseFloat(req.query.lng as string);
  }

  let pharmaciesWithDistance = store.pharmacies.map((pharmacy) => {
    const distanceKm = calculateDistance(originLat, originLng, pharmacy.latitude, pharmacy.longitude);
    return {
      ...pharmacy,
      distanceKm,
    };
  });

  // Sort by nearest distance first
  pharmaciesWithDistance.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

  // Radius filtering (1km, 3km, 5km)
  if (radiusKm) {
    const maxRadius = parseFloat(radiusKm as string);
    if (!isNaN(maxRadius) && maxRadius > 0) {
      pharmaciesWithDistance = pharmaciesWithDistance.filter((p) => (p.distanceKm || 0) <= maxRadius);
    }
  }

  if (open24Hours === 'true') {
    pharmaciesWithDistance = pharmaciesWithDistance.filter((p) => p.isOpen24Hours);
  }

  if (deliveryOnly === 'true') {
    pharmaciesWithDistance = pharmaciesWithDistance.filter((p) => p.deliveryAvailable);
  }

  res.json(pharmaciesWithDistance);
});

// GET /api/pharmacies/:id - Pharmacy details
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const pharmacy = store.pharmacies.find((p) => p.id === req.params.id);
  if (!pharmacy) {
    return res.status(404).json({ error: 'Pharmacy not found' });
  }
  res.json(pharmacy);
});

export default router;
