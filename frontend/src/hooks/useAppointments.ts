import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Appointment } from '../types/shared';

export const useAppointments = (filters?: {
  patientId?: string;
  doctorId?: string;
  hospitalId?: string;
  status?: string;
}) => {
  return useQuery<Appointment[]>({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.patientId) params.append('patientId', filters.patientId);
      if (filters?.doctorId) params.append('doctorId', filters.doctorId);
      if (filters?.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters?.status) params.append('status', filters.status);

      const res = await api.get(`/appointments?${params.toString()}`);
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // 2 mins cache
  });
};

export const useCreateAppointment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentData: {
      patientId: string;
      doctorId: string;
      hospitalId?: string;
      dateTime: string;
      type: 'in_person' | 'telehealth';
      reason: string;
      notes?: string;
      triageLevel?: 'routine' | 'urgent' | 'emergency';
    }) => {

      const res = await api.post('/appointments', appointmentData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};
