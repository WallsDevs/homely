import { zodResolver } from '@hookform/resolvers/zod';
import { MEMBER_COLORS, updateHouseholdSchema, updateMeSchema } from '@homely/shared';
import { Check, ChevronRight, Database, LogOut } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ThemeSwitcher } from '@/app/layouts/theme-switcher.tsx';
import { useHouseholdSession, useLogout } from '@/features/auth/api/session.ts';
import { useLeaveHousehold, useUpdateMe } from '@/features/members/api/members.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { cn } from '@/shared/lib/cn.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  currencyOptions,
  timezoneOptions,
  WEEKDAY_LABELS,
  weekStartOptions,
} from '@/shared/lib/locale-options.ts';
import {
  Avatar,
  Button,
  Card,
  CardHeader,
  FormAlert,
  Input,
  PageHeader,
  Select,
  Sheet,
  useToast,
} from '@/shared/ui/index.ts';
import { useUpdateHousehold } from '../api/household.ts';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          <ProfileCard />
          <AppearanceCard />
          <SessionCard />
          <DataLinkCard />
        </div>
        <HouseholdCard />
      </div>
    </>
  );
}

function ProfileCard() {
  const { membership, user } = useHouseholdSession();
  const updateMe = useUpdateMe();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(updateMeSchema.required()),
    values: { displayName: membership.displayName, color: membership.color },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateMe.mutateAsync(values);
      toast.show({ message: 'Perfil actualizado', tone: 'success' });
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['displayName', 'color']));
    }
  });

  const preview = useWatch({ control: form.control });

  return (
    <Card>
      <CardHeader title="Tu perfil" subtitle={user.email} />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <div className="flex items-end gap-3">
          <Avatar
            name={preview.displayName || '?'}
            color={preview.color ?? membership.color}
            size={40}
          />
          <Input
            label="Nombre visible en el hogar"
            className="flex-1"
            error={form.formState.errors.displayName?.message}
            {...form.register('displayName')}
          />
        </div>
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-small font-medium text-fg-2">Tu color</legend>
              <div className="flex flex-wrap gap-2">
                {MEMBER_COLORS.map((color) => (
                  <label
                    key={color}
                    className="relative flex size-9 cursor-pointer items-center justify-center rounded-full has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-surface"
                    style={{ backgroundColor: color }}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={color}
                      checked={field.value === color}
                      onChange={() => field.onChange(color)}
                      className="sr-only"
                      aria-label={`Color ${color}`}
                    />
                    {field.value === color && <Check className="size-4 text-white" aria-hidden />}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={updateMe.isPending}
            disabled={!form.formState.isDirty}
            className="w-full md:w-auto"
          >
            Guardar perfil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function HouseholdCard() {
  const { household, isAdmin } = useHouseholdSession();
  const update = useUpdateHousehold();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(updateHouseholdSchema.required()),
    values: {
      name: household.name,
      currency: household.currency,
      timezone: household.timezone,
      weekStartsOn: household.weekStartsOn,
    },
  });
  const { errors } = form.formState;

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader title="Hogar" subtitle="Solo un administrador puede cambiar estos datos" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-body">
          <dt className="text-fg-3">Nombre</dt>
          <dd>{household.name}</dd>
          <dt className="text-fg-3">Moneda</dt>
          <dd>{household.currency}</dd>
          <dt className="text-fg-3">Zona horaria</dt>
          <dd className="break-all">{household.timezone.replaceAll('_', ' ')}</dd>
          <dt className="text-fg-3">Inicio de semana</dt>
          <dd>{WEEKDAY_LABELS[household.weekStartsOn]}</dd>
        </dl>
      </Card>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await update.mutateAsync(values);
      toast.show({ message: 'Hogar actualizado', tone: 'success' });
    } catch (error) {
      setFormError(
        applyApiError(error, form.setError, ['name', 'currency', 'timezone', 'weekStartsOn']),
      );
    }
  });

  return (
    <Card>
      <CardHeader title="Hogar" subtitle="Lo ven y comparten todos los miembros" />
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormAlert message={formError} />
        <Input label="Nombre" error={errors.name?.message} {...form.register('name')} />
        <Select
          label="Moneda"
          options={currencyOptions()}
          error={errors.currency?.message}
          {...form.register('currency')}
        />
        <Select
          label="Zona horaria"
          options={timezoneOptions()}
          error={errors.timezone?.message}
          {...form.register('timezone')}
        />
        <Select
          label="La semana empieza el"
          options={weekStartOptions}
          helper="Aplica a las semanas siguientes"
          error={errors.weekStartsOn?.message}
          {...form.register('weekStartsOn')}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={update.isPending}
            disabled={!form.formState.isDirty}
            className="w-full md:w-auto"
          >
            Guardar hogar
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AppearanceCard() {
  return (
    <Card>
      <CardHeader title="Apariencia" />
      <ThemeSwitcher />
    </Card>
  );
}

/** RP-12: acceso a la limpieza de datos y la actividad del hogar (solo admins). */
function DataLinkCard() {
  const { isAdmin } = useHouseholdSession();
  if (!isAdmin) return null;
  return (
    <Link
      to="/settings/data"
      className="flex items-center gap-3 rounded-md border border-line bg-surface p-4 transition-colors md:p-5 hover-pointer:bg-surface-2"
    >
      <Database className="size-5 text-fg-2" aria-hidden />
      <span className="flex-1">
        <span className="block font-medium">Datos del hogar</span>
        <span className="block text-small text-fg-3">Vaciar datos antiguos y ver la actividad</span>
      </span>
      <ChevronRight className="size-4 text-fg-3" aria-hidden />
    </Link>
  );
}

function SessionCard() {
  const { household } = useHouseholdSession();
  const logout = useLogout();
  const leave = useLeaveHousehold();
  const toast = useToast();
  const [confirmLeave, setConfirmLeave] = useState(false);

  return (
    <Card>
      <CardHeader title="Sesión" />
      <div className="flex flex-col gap-2 md:flex-row">
        <Button
          variant="secondary"
          icon={<LogOut className="size-4" />}
          loading={logout.isPending && !logout.variables.everywhere}
          onClick={() => logout.mutate({ everywhere: false })}
        >
          Cerrar sesión
        </Button>
        <Button
          variant="ghost"
          loading={logout.isPending && logout.variables.everywhere}
          onClick={() => logout.mutate({ everywhere: true })}
        >
          Cerrar en todos los dispositivos
        </Button>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <button
          type="button"
          className={cn('text-small font-medium text-danger')}
          onClick={() => setConfirmLeave(true)}
        >
          Salir de {household.name}
        </button>
      </div>

      <Sheet
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title={`¿Salir de ${household.name}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={leave.isPending}
              onClick={() =>
                leave.mutate(undefined, {
                  onError: (error) => {
                    setConfirmLeave(false);
                    toast.show({ message: errorMessage(error), tone: 'danger' });
                  },
                })
              }
            >
              Salir del hogar
            </Button>
          </>
        }
      >
        <p className="pb-2 text-body text-fg-2">
          Dejarás de ver sus tareas y gastos. Tu historial se conserva y podrás volver con un nuevo
          código de invitación.
        </p>
      </Sheet>
    </Card>
  );
}
