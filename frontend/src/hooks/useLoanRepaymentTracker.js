import { useQuery } from '@tanstack/react-query';
import { getLoanRepaymentTracker } from '../services/admin/adminLoanService';

export default function useLoanRepaymentTracker(id) {
  return useQuery(['loanRepaymentTracker', id], async () => {
    const res = await getLoanRepaymentTracker(id);
    return res;
  }, { enabled: !!id });
}
