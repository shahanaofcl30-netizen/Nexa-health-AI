/**
 * Nexa Health AI - Treatments & Clinical Intervention Data Hook
 * REQUIRES CLINICAL VALIDATION — NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Treatment } from '../types/shared';

export const useTreatments = (filters?: {
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
}) => {
  return useQuery<Treatment[]>({
    queryKey: ['treatments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.patientId) params.append('patientId', filters.patientId);
      if (filters?.doctorId) params.append('doctorId', filters.doctorId);
      if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId);

      const res = await api.get(`/treatments?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateTreatment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (treatmentData: {
      patientId: string;
      doctorId: string;
      hospitalId: string;
      appointmentId?: string;
      symptoms: string;
      diagnosis: string;
      treatmentDetails: string;
      clinicalNotes: string;
      medicines?: any[];
      followUpDate?: string;
    }) => {
      // REQUIRES CLINICAL VALIDATION — NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL JUDGMENT.

      const res = await api.post('/treatments', treatmentData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};
