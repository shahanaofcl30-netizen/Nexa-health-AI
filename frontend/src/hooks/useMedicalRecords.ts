import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface MedicalRecordDoc {
  id: string;
  patientId: string;
  doctorId?: string;
  hospitalId?: string;
  appointmentId?: string;
  recordType: string;
  title: string;
  description?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export const useMedicalRecords = (patientId?: string) => {
  return useQuery<MedicalRecordDoc[]>({
    queryKey: ['medical_records', patientId],
    queryFn: async () => {

      const res = await api.get('/admin/documents');
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateMedicalRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordData: {
      patientId: string;
      title: string;
      recordType: string;
      description?: string;
      documentUrl?: string;
    }) => {

      const res = await api.post('/admin/documents', recordData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_records'] });
    },
  });
};
