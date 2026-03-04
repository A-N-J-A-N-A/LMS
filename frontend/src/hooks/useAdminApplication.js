import { useQuery } from '@tanstack/react-query';
import { getApplicationById } from '../services/admin/adminLoanService';

export default function useAdminApplication(id) {
  return useQuery(['adminApplication', id], async () => {
    const res = await getApplicationById(id);
    return res;
  }, { enabled: !!id });
}
