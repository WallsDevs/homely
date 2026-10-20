import {
  invitationSchema,
  invitationsResponseSchema,
  memberSchema,
  membersResponseSchema,
  type CreateInvitationInput,
  type Member,
  type Role,
  type Session,
  type UpdateMeInput,
} from '@homely/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client.ts';
import { sessionKey } from '@/features/auth/api/session.ts';

export const memberKeys = {
  all: ['members'] as const,
  list: (includeInactive: boolean) => ['members', 'list', { includeInactive }] as const,
  invitations: ['members', 'invitations'] as const,
};

export function useMembers(includeInactive = false) {
  return useQuery({
    queryKey: memberKeys.list(includeInactive),
    queryFn: ({ signal }) =>
      api('/members', {
        query: { includeInactive: includeInactive || undefined },
        schema: membersResponseSchema,
        signal,
      }).then((res) => res.items),
  });
}

export function useInvitations(enabled: boolean) {
  return useQuery({
    queryKey: memberKeys.invitations,
    queryFn: ({ signal }) =>
      api('/invitations', { schema: invitationsResponseSchema, signal }).then((res) => res.items),
    enabled,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvitationInput) =>
      api('/invitations', { method: 'POST', body: input, schema: invitationSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.invitations }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/invitations/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: memberKeys.invitations }),
  });
}

/** Tras cambiar un miembro: refresca listas y, si soy yo, la sesión (mi rol pudo cambiar). */
function useMemberChanged() {
  const queryClient = useQueryClient();
  return (member: Member) => {
    void queryClient.invalidateQueries({ queryKey: memberKeys.all });
    queryClient.setQueryData<Session | null>(sessionKey, (session) =>
      session?.membership?.id === member.id ? { ...session, membership: member } : session,
    );
  };
}

export function useChangeRole() {
  const onChanged = useMemberChanged();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api(`/members/${id}/role`, { method: 'PATCH', body: { role }, schema: memberSchema }),
    onSuccess: onChanged,
  });
}

export function useSetMemberActive() {
  const onChanged = useMemberChanged();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/members/${id}/status`, { method: 'PATCH', body: { isActive }, schema: memberSchema }),
    onSuccess: onChanged,
  });
}

export function useUpdateMe() {
  const onChanged = useMemberChanged();
  return useMutation({
    mutationFn: (input: UpdateMeInput) =>
      api('/members/me', { method: 'PATCH', body: input, schema: memberSchema }),
    onSuccess: onChanged,
  });
}

export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/members/me/leave', { method: 'POST' }),
    onSuccess: () => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
      return queryClient.invalidateQueries({ queryKey: sessionKey });
    },
  });
}
