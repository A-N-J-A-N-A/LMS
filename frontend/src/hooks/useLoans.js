import { useQuery } from '@tanstack/react-query';
import { getAllLoans } from '../services/loanService';

export default function useLoans() {
  return useQuery(['loans'], async () => {
    const response = await getAllLoans();
    return Array.isArray(response.data) ? response.data : [];
  });
}
