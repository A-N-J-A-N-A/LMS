import { useMutation } from '@tanstack/react-query';
import { trackApplicationById } from '../services/loanService';

export default function useTrackApplication() {
  return useMutation((id) => trackApplicationById(id));
}
