import type { ReactNode } from 'react';
import { useId } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { cn } from '@/shared/lib/cn.ts';
import { Avatar } from '@/shared/ui/index.ts';
import { useMembers } from '../api/members.ts';

type MemberPickerProps = {
  label: string;
  value: string | null;
  onChange: (memberId: string | null) => void;
  /** Texto de la opción "nadie". */
  noneLabel?: string;
  error?: string | undefined;
};

/** Elegir responsable tocando su avatar. Se desliza horizontalmente si hay muchos miembros. */
export function MemberPicker({
  label,
  value,
  onChange,
  noneLabel = 'Sin asignar',
  error,
}: MemberPickerProps) {
  const { membership } = useHouseholdSession();
  const members = useMembers();
  const name = useId();

  return (
    <fieldset>
      <legend className="mb-2 text-small font-medium text-fg-2">{label}</legend>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {members.data?.map((member) => (
          <Chip
            key={member.id}
            name={name}
            label={member.id === membership.id ? `${member.displayName} (tú)` : member.displayName}
            checked={value === member.id}
            onSelect={() => onChange(member.id)}
          >
            <Avatar name={member.displayName} color={member.color} size={32} />
          </Chip>
        ))}
        <Chip
          name={name}
          label={noneLabel}
          checked={value === null}
          onSelect={() => onChange(null)}
        >
          <span className="size-8 rounded-full border-2 border-dashed border-line" />
        </Chip>
      </div>
      {error && <p className="mt-1 text-small text-danger">{error}</p>}
    </fieldset>
  );
}

function Chip({
  name,
  label,
  checked,
  onSelect,
  children,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex w-18 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-center text-small transition-colors',
        'has-focus-visible:ring-2 has-focus-visible:ring-accent',
        checked ? 'border-accent bg-accent-soft text-fg' : 'border-transparent text-fg-2',
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {children}
      <span className="w-full truncate">{label}</span>
    </label>
  );
}
