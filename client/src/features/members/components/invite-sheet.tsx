import type { Invitation, Role } from '@homely/shared';
import { Check, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { Button, FormAlert, SegmentedControl, Select, Sheet } from '@/shared/ui/index.ts';
import { useCreateInvitation } from '../api/members.ts';

type InviteSheetProps = { open: boolean; onClose: () => void; householdName: string };

const expiryOptions = [
  { value: '1', label: '1 día' },
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
];

/** HM-02: genera un código con el rol con el que entrará la persona. */
export function InviteSheet({ open, onClose, householdName }: InviteSheetProps) {
  const create = useCreateInvitation();
  const [role, setRole] = useState<Role>('MEMBER');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [created, setCreated] = useState<Invitation | null>(null);

  const close = () => {
    onClose();
    setCreated(null);
    create.reset();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title={created ? 'Comparte el código' : 'Invitar al hogar'}
      description={created ? undefined : 'Genera un código y compártelo por WhatsApp o en persona.'}
      footer={
        created ? (
          <Button onClick={close}>Listo</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={create.isPending}
              onClick={() =>
                create.mutate(
                  { role, expiresInDays: Number(expiresInDays), maxUses: 1 },
                  { onSuccess: setCreated },
                )
              }
            >
              Generar código
            </Button>
          </>
        )
      }
    >
      {created ? (
        <CreatedCode invitation={created} householdName={householdName} />
      ) : (
        <div className="flex flex-col gap-5 pb-2">
          <FormAlert message={create.error ? errorMessage(create.error) : null} />
          <div>
            <SegmentedControl
              label="Entrará como"
              hideLabel={false}
              value={role}
              onChange={setRole}
              options={[
                { value: 'MEMBER', label: 'Miembro' },
                { value: 'ADMIN', label: 'Administrador' },
              ]}
            />
            <p className="mt-2 text-small text-fg-3">
              {role === 'ADMIN'
                ? 'Tendrá exactamente tus mismos permisos: crear tareas, planes, metas y gestionar miembros.'
                : 'Podrá completar sus tareas, registrar gastos y ver los reportes.'}
            </p>
          </div>
          <Select
            label="El código vence en"
            options={expiryOptions}
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
          />
        </div>
      )}
    </Sheet>
  );
}

function CreatedCode({
  invitation,
  householdName,
}: {
  invitation: Invitation;
  householdName: string;
}) {
  const [copied, setCopied] = useState(false);
  const message = `Únete a «${householdName}» en Homely con el código ${invitation.code}`;
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invitation.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el código queda visible para copiarlo a mano.
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 pt-2 pb-4 text-center">
      <p className="rounded-lg bg-surface-2 px-6 py-4 font-mono text-[28px] font-semibold tracking-[0.18em] select-all">
        {invitation.code}
      </p>
      <p className="text-small text-fg-2">
        Entrará como <strong>{invitation.role === 'ADMIN' ? 'administrador' : 'miembro'}</strong>.
        Sirve una sola vez y vence el{' '}
        {new Date(invitation.expiresAt).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
        .
      </p>
      <div className="flex w-full gap-2">
        <Button
          variant="secondary"
          fullWidth
          icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          onClick={() => void copy()}
        >
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
        {canShare && (
          <Button
            fullWidth
            icon={<Share2 className="size-4" />}
            onClick={() => void navigator.share({ text: message }).catch(() => undefined)}
          >
            Compartir
          </Button>
        )}
      </div>
    </div>
  );
}
