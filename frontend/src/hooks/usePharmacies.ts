import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Pharmacy } from '../types/shared';

// Helper function to calculate distance using Haversine formula
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const usePharmacies = (filters?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  open24HoursOnly?: boolean;
  searchQuery?: string;
}) => {
  return useQuery<Pharmacy[]>({
    queryKey: ['pharmacies', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.lat && filters?.lng) {
        params.append('lat', filters.lat.toString());
        params.append('lng', filters.lng.toString());
        if (filters.radiusKm) params.append('radiusKm', filters.radiusKm.toString());
      }
      if (filters?.open24HoursOnly) params.append('open24Hours', 'true');
      if (filters?.searchQuery) params.append('q', filters.searchQuery);

      const res = await api.get(`/pharmacies?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};
