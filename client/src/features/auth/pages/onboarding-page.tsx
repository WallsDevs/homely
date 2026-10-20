import { zodResolver } from '@hookform/resolvers/zod';
import { createHouseholdSchema, joinHouseholdSchema } from '@homely/shared';
import { House, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  browserTimeZone,
  currencyOptions,
  timezoneOptions,
  weekStartOptions,
} from '@/shared/lib/locale-options.ts';
import { Button, FormAlert, Input, SegmentedControl, Select } from '@/shared/ui/index.ts';
import { useCreateHousehold, useJoinHousehold, useLogout, useSession } from '../api/session.ts';

type Mode = 'create' | 'join';

export function OnboardingPage() {
  const { data: session } = useSession();
  const logout = useLogout();
  const [mode, setMode] = useState<Mode>('create');

  return (
    <>
      <h1 className="text-display">Hola, {session?.user.name}</h1>
      <p className="mt-1 mb-6 text-body text-fg-2">
        Crea tu hogar o únete al de tu pareja con el código que te compartió.
      </p>

      <SegmentedControl
        label="¿Qué quieres hacer?"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'create', label: 'Crear hogar', icon: <House /> },
          { value: 'join', label: 'Tengo un código', icon: <KeyRound /> },
        ]}
        className="mb-6"
      />

      {mode === 'create' ? <CreateHouseholdForm /> : <JoinHouseholdForm />}

      <p className="mt-10 text-center text-small text-fg-3">
        ¿No eres {session?.user.name}?{' '}
        <button
          type="button"
          className="font-medium text-fg-2 underline-offset-2 hover:underline"
          onClick={() => logout.mutate({ everywhere: false })}
        >
          Cerrar sesión
        </button>
      </p>
    </>
  );
}

function CreateHouseholdForm() {
  const create = useCreateHousehold();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { name: '', currency: 'USD', timezone: browserTimeZone(), weekStartsOn: 'MON' },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await create.mutateAsync(values);
    } catch (error) {
      setFormError(
        applyApiError(error, form.setError, ['name', 'currency', 'timezone', 'weekStartsOn']),
      );
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <Input
        label="Nombre del hogar"
        placeholder="Casa"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <Select
        label="Moneda"
        options={currencyOptions()}
        error={errors.currency?.message}
        {...form.register('currency')}
      />
      <Select
        label="Zona horaria"
        options={timezoneOptions()}
        helper="Define qué día es «hoy» para las tareas"
        error={errors.timezone?.message}
        {...form.register('timezone')}
      />
      <Select
        label="La semana empieza el"
        options={weekStartOptions}
        error={errors.weekStartsOn?.message}
        {...form.register('weekStartsOn')}
      />
      <Button type="submit" size="lg" fullWidth loading={create.isPending} className="mt-2">
        Crear hogar
      </Button>
    </form>
  );
}

function JoinHouseholdForm() {
  const join = useJoinHousehold();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(joinHouseholdSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await join.mutateAsync(values);
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['code']));
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <Input
        label="Código de invitación"
        placeholder="K7MP-QW3R"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        className="[&_input]:font-medium [&_input]:tracking-[0.2em] [&_input]:uppercase"
        error={form.formState.errors.code?.message}
        {...form.register('code')}
      />
      <Button type="submit" size="lg" fullWidth loading={join.isPending} className="mt-2">
        Unirme al hogar
      </Button>
    </form>
  );
}
