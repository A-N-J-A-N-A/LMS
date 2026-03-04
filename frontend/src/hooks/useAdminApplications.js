import { useQuery } from '@tanstack/react-query';
import { getAllApplications } from '../services/admin/adminLoanService';

export default function useAdminApplications(status) {
  return useQuery(['adminApplications', status], async () => {
    const res = await getAllApplications(status);
    return Array.isArray(res) ? res : res?.data || [];
  }, { keepPreviousData: true });
}
