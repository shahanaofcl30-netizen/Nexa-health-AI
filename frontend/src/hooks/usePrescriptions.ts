import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Prescription } from '../types/shared';

export const usePrescriptions = (filters?: {
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
}) => {
  return useQuery<Prescription[]>({
    queryKey: ['prescriptions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.patientId) params.append('patientId', filters.patientId);
      if (filters?.doctorId) params.append('doctorId', filters.doctorId);
      if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId);

      const res = await api.get(`/prescriptions?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionData: {
      patientId: string;
      doctorId: string;
      hospitalId?: string;
      appointmentId?: string;
      treatmentId?: string;
      instructions?: string;
      items: Array<{
        medicationName: string;
        dosage: string;
        frequency: string;
        duration: string;
        instructions?: string;
      }>;
    }) => {

      const res = await api.post('/prescriptions', prescriptionData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
};
