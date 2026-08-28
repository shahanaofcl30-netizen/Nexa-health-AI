import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Patient } from '../types/shared';

export const usePatients = (searchQuery?: string) => {
  return useQuery<Patient[]>({
    queryKey: ['patients', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);

      const res = await api.get(`/patients?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const usePatient = (id?: string) => {
  return useQuery<Patient>({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) throw new Error('Patient ID is required');

      const res = await api.get(`/patients/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
};

export const useCurrentPatient = () => {
  return useQuery<Patient | null>({
    queryKey: ['current_patient'],
    queryFn: async () => {
      // 1. Try Supabase via user ID from local storage

      // 2. Fallback: Express API
      try {
        const res = await api.get('/patients/me');
        return res.data;
      } catch (err) {
        console.warn('API fetch current patient error:', err);
        return null;
      }
    },
    // Only run this query if the user is a patient
    enabled: localStorage.getItem('nexa_active_role') === 'patient',
    staleTime: 1000 * 60 * 2,
  });
};
