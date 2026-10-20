import type { Member } from '@homely/shared';
import { ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { cn } from '@/shared/lib/cn.ts';
import { Avatar, Sheet, useToast } from '@/shared/ui/index.ts';
import { useChangeRole, useSetMemberActive } from '../api/members.ts';

type MemberActionsSheetProps = {
  member: Member | null;
  isSelf: boolean;
  onClose: () => void;
};

/** Acciones de admin sobre un miembro (HM-05). El server garantiza que nunca quede sin admin. */
export function MemberActionsSheet({ member, isSelf, onClose }: MemberActionsSheetProps) {
  const toast = useToast();
  const changeRole = useChangeRole();
  const setActive = useSetMemberActive();

  const run = (action: Promise<unknown>, success: string) => {
    onClose();
    action.then(
      () => toast.show({ message: success, tone: 'success' }),
      (error: unknown) => toast.show({ message: errorMessage(error), tone: 'danger' }),
    );
  };

  // La hoja queda montada siempre; el contenido existe solo con un miembro seleccionado.
  return (
    <Sheet open={member !== null} onClose={onClose} title={member?.displayName ?? ''}>
      {member && (
        <MemberActions
          member={member}
          isSelf={isSelf}
          onChangeRole={(role) =>
            run(
              changeRole.mutateAsync({ id: member.id, role }),
              role === 'ADMIN'
                ? `${member.displayName} ahora es admin`
                : `${member.displayName} ahora es miembro`,
            )
          }
          onToggleActive={() =>
            run(
              setActive.mutateAsync({ id: member.id, isActive: !member.isActive }),
              member.isActive
                ? `${member.displayName} fue desactivado`
                : `${member.displayName} fue reactivado`,
            )
          }
        />
      )}
    </Sheet>
  );
}

function MemberActions({
  member,
  isSelf,
  onChangeRole,
  onToggleActive,
}: {
  member: Member;
  isSelf: boolean;
  onChangeRole: (role: 'ADMIN' | 'MEMBER') => void;
  onToggleActive: () => void;
}) {
  const isAdmin = member.role === 'ADMIN';
  const name = isSelf ? 'ti' : member.displayName;

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={member.displayName} color={member.color} size={40} />
        <p className="text-small text-fg-2">
          {isAdmin ? 'Administrador' : 'Miembro'}
          {!member.isActive && ' · Inactivo'}
        </p>
      </div>
      <ul className="-mx-2 flex flex-col pb-2">
        {member.isActive && (
          <Action
            icon={isAdmin ? <ShieldOff /> : <ShieldCheck />}
            label={isAdmin ? 'Quitar permisos de administrador' : 'Hacer administrador'}
            hint={
              isAdmin
                ? `Quedará como miembro: verá y completará sus tareas.`
                : `Tendrá los mismos permisos que tú.`
            }
            onClick={() => onChangeRole(isAdmin ? 'MEMBER' : 'ADMIN')}
          />
        )}
        <Action
          icon={member.isActive ? <UserX /> : <UserCheck />}
          label={member.isActive ? `Desactivar a ${name}` : 'Reactivar'}
          hint={
            member.isActive
              ? 'Conserva su historial, deja de recibir tareas y pierde el acceso al hogar.'
              : 'Vuelve a tener acceso al hogar.'
          }
          tone={member.isActive ? 'danger' : 'default'}
          onClick={onToggleActive}
        />
      </ul>
    </>
  );
}

function Action({
  icon,
  label,
  hint,
  onClick,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-start gap-3 rounded-md px-2 py-3 text-left transition-colors active:bg-surface-2 hover-pointer:bg-surface-2"
      >
        <span
          className={cn('mt-0.5 [&>svg]:size-5', tone === 'danger' ? 'text-danger' : 'text-fg-2')}
        >
          {icon}
        </span>
        <span>
          <span className={cn('block font-medium', tone === 'danger' && 'text-danger')}>
            {label}
          </span>
          <span className="block text-small text-fg-3">{hint}</span>
        </span>
      </button>
    </li>
  );
}
