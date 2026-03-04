import { useQuery } from '@tanstack/react-query';
import { getActiveLoans } from '../services/admin/adminLoanService';

export default function useAdminActiveLoans() {
  return useQuery(['adminActiveLoans'], async () => {
    const res = await getActiveLoans();
    return Array.isArray(res) ? res : res?.data || [];
  });
}
