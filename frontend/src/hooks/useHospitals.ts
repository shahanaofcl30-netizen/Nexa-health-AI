import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Hospital, TamilNaduDistrict } from '../types/shared';

// Fetch all Tamil Nadu Districts
export const useTamilNaduDistricts = () => {
  return useQuery<TamilNaduDistrict[]>({
    queryKey: ['tamil_nadu_districts'],
    queryFn: async () => {
      
      const res = await api.get('/hospitals/districts');
      return res.data;
    },
    staleTime: 1000 * 60 * 30, // 30 mins cache
  });
};

// Fetch Hospitals with optional filters
export const useHospitals = (filters?: {
  district?: string;
  type?: string;
  emergencyOnly?: boolean;
  searchQuery?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}) => {
  return useQuery<Hospital[]>({
    queryKey: ['hospitals', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.district) params.append('district', filters.district);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.emergencyOnly) params.append('emergencyOnly', 'true');
      if (filters?.searchQuery) params.append('q', filters.searchQuery);
      if (filters?.lat && filters?.lng) {
        params.append('lat', filters.lat.toString());
        params.append('lng', filters.lng.toString());
        if (filters.radiusKm) params.append('radiusKm', filters.radiusKm.toString());
      }


      const res = await api.get(`/hospitals?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
};

// Fetch single Hospital by ID
export const useHospital = (id?: string) => {
  return useQuery<Hospital>({
    queryKey: ['hospital', id],
    queryFn: async () => {
      if (!id) throw new Error('Hospital ID is required');

      const res = await api.get(`/hospitals/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
};
