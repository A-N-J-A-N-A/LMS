import { useQuery } from '@tanstack/react-query';
import { getLoanById } from '../services/loanService';

export default function useLoan(id) {
  return useQuery(['loan', id], async () => {
    const res = await getLoanById(id);
    return res.data;
  }, { enabled: !!id });
}
