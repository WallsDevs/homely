import type { Invitation, Member } from '@homely/shared';
import { Ellipsis, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  IconButton,
  PageHeader,
  Skeleton,
  useToast,
  type BadgeTone,
} from '@/shared/ui/index.ts';
import { useInvitations, useMembers, useRevokeInvitation } from '../api/members.ts';
import { InviteSheet } from '../components/invite-sheet.tsx';
import { MemberActionsSheet } from '../components/member-actions-sheet.tsx';

export function MembersPage() {
  const { membership, household, isAdmin } = useHouseholdSession();
  const [showInactive, setShowInactive] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const members = useMembers(isAdmin && showInactive);

  const activeCount = members.data?.filter((m) => m.isActive).length;
  const inviteButton = (
    <Button icon={<UserPlus className="size-4" />} onClick={() => setInviteOpen(true)}>
      Invitar
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Miembros"
        subtitle={
          activeCount === undefined
            ? household.name
            : `${household.name} · ${activeCount} ${activeCount === 1 ? 'persona' : 'personas'}`
        }
        action={isAdmin ? inviteButton : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card className="p-0 md:p-0">
          {members.isPending ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {members.data?.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isSelf={member.id === membership.id}
                  onActions={isAdmin ? () => setSelected(member) : undefined}
                />
              ))}
            </ul>
          )}
          {isAdmin && (
            <label className="flex items-center gap-2 border-t border-line px-4 py-3 text-small text-fg-2">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Mostrar miembros inactivos
            </label>
          )}
        </Card>

        {isAdmin && <InvitationsCard onInvite={() => setInviteOpen(true)} />}
      </div>

      {isAdmin && (
        <>
          <div className="mt-6 lg:hidden">
            <MobileInvite onClick={() => setInviteOpen(true)} />
          </div>
          <InviteSheet
            open={inviteOpen}
            onClose={() => setInviteOpen(false)}
            householdName={household.name}
          />
          <MemberActionsSheet
            member={selected}
            isSelf={selected?.id === membership.id}
            onClose={() => setSelected(null)}
          />
        </>
      )}
    </>
  );
}

function MobileInvite({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="secondary"
      size="lg"
      fullWidth
      icon={<UserPlus className="size-4" />}
      onClick={onClick}
    >
      Invitar a alguien
    </Button>
  );
}

function MemberRow({
  member,
  isSelf,
  onActions,
}: {
  member: Member;
  isSelf: boolean;
  onActions: (() => void) | undefined;
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-3">
      <Avatar name={member.displayName} color={member.color} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {member.displayName}
          {isSelf && <span className="font-normal text-fg-3"> (tú)</span>}
        </p>
        <p className="text-small text-fg-3">
          Desde{' '}
          {new Date(member.joinedAt).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {!member.isActive && <Badge>Inactivo</Badge>}
        {member.role === 'ADMIN' && <Badge tone="accent">Admin</Badge>}
        {onActions && (
          <IconButton
            aria-label={`Acciones para ${member.displayName}`}
            icon={<Ellipsis className="size-5" />}
            onClick={onActions}
          />
        )}
      </div>
    </li>
  );
}

const statusBadge: Record<Invitation['status'], { label: string; tone: BadgeTone }> = {
  ACTIVE: { label: 'Vigente', tone: 'success' },
  USED: { label: 'Usado', tone: 'neutral' },
  EXPIRED: { label: 'Vencido', tone: 'neutral' },
  REVOKED: { label: 'Revocado', tone: 'neutral' },
};

function InvitationsCard({ onInvite }: { onInvite: () => void }) {
  const invitations = useInvitations(true);
  const revoke = useRevokeInvitation();
  const toast = useToast();
  const recent = invitations.data?.slice(0, 6) ?? [];

  return (
    <Card>
      <CardHeader title="Códigos de invitación" subtitle="Los últimos que generaste" />
      {invitations.isPending ? (
        <Skeleton className="h-16" />
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-small text-fg-2">
            Aún no has invitado a nadie. Genera un código para tu pareja o tu familia.
          </p>
          <Button variant="secondary" size="sm" onClick={onInvite}>
            Generar código
          </Button>
        </div>
      ) : (
        <ul className="-mx-1 flex flex-col">
          {recent.map((invitation) => {
            const badge = statusBadge[invitation.status];
            return (
              <li key={invitation.id} className="flex items-center gap-2 px-1 py-2">
                <span
                  className={
                    invitation.status === 'ACTIVE'
                      ? 'font-mono text-body font-medium tracking-wider'
                      : 'font-mono text-body tracking-wider text-fg-3 line-through'
                  }
                >
                  {invitation.code}
                </span>
                <span className="flex-1 text-small text-fg-3">
                  {invitation.role === 'ADMIN' ? 'Admin' : 'Miembro'}
                </span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
                {invitation.status === 'ACTIVE' && (
                  <IconButton
                    size="sm"
                    aria-label={`Revocar el código ${invitation.code}`}
                    icon={<X className="size-4" />}
                    onClick={() =>
                      revoke.mutate(invitation.id, {
                        onError: (error) =>
                          toast.show({ message: errorMessage(error), tone: 'danger' }),
                      })
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
