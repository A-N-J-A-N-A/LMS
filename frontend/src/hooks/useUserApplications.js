import { useQuery } from '@tanstack/react-query';
import { getUserApplications } from '../services/loanService';

export default function useUserApplications() {
  return useQuery(['userApplications'], async () => {
    const res = await getUserApplications();
    return res.data || [];
  });
}
