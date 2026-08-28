import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Doctor } from '../types/shared';

export const useDoctors = (filters?: {
  hospitalId?: string;
  specialization?: string;
  searchQuery?: string;
}) => {
  return useQuery<Doctor[]>({
    queryKey: ['doctors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters?.specialization) params.append('specialization', filters.specialization);
      if (filters?.searchQuery) params.append('q', filters.searchQuery);

      const res = await api.get(`/doctors?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useDoctor = (id?: string) => {
  return useQuery<Doctor>({
    queryKey: ['doctor', id],
    queryFn: async () => {
      if (!id) throw new Error('Doctor ID is required');

      const res = await api.get(`/doctors/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
};
