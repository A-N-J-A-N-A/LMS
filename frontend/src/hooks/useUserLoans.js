import { useQuery } from '@tanstack/react-query';
import { getUserLoans } from '../services/loanService';

export default function useUserLoans() {
  return useQuery(['userLoans'], async () => {
    const res = await getUserLoans();
    return res.data || [];
  });
}
