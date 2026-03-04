import { useQuery } from '@tanstack/react-query';
import { getMyNotifications } from '../services/notificationService';

export default function useNotifications() {
  return useQuery(['notifications'], async () => {
    const res = await getMyNotifications();
    return Array.isArray(res.data) ? res.data : [];
  });
}
