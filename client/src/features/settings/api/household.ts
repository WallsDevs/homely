import { householdSchema, type Session, type UpdateHouseholdInput } from '@homely/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionKey } from '@/features/auth/api/session.ts';
import { api } from '@/shared/lib/api-client.ts';

export function useUpdateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHouseholdInput) =>
      api('/households/current', { method: 'PATCH', body: input, schema: householdSchema }),
    onSuccess: (household) => {
      queryClient.setQueryData<Session | null>(sessionKey, (session) =>
        session ? { ...session, household } : session,
      );
    },
  });
}
