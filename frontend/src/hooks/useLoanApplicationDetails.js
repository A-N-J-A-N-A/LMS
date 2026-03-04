import { useQuery } from '@tanstack/react-query';
import { getLoanApplicationDetails } from '../services/loanService';

export default function useLoanApplicationDetails(id) {
  return useQuery(['loanApplication', id], async () => {
    const res = await getLoanApplicationDetails(id);
    return res.data;
  }, { enabled: !!id });
}
