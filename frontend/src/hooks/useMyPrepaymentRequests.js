import { useQuery } from '@tanstack/react-query';
import { getMyPrepaymentRequests } from '../services/loanService';

export default function useMyPrepaymentRequests(loanApplicationId) {
  return useQuery(['myPrepaymentRequests', loanApplicationId], async () => {
    const res = await getMyPrepaymentRequests(loanApplicationId);
    return res.data || [];
  }, { enabled: loanApplicationId !== undefined });
}
