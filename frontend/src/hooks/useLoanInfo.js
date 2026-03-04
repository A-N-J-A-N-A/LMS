import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function useLoanInfo(id) {
  return useQuery(['loanInfo', id], async () => {
    const res = await api.get(`/loans/info/${id}`);
    return res.data;
  }, { enabled: !!id });
}
