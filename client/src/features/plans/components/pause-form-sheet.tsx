import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, createPauseSchema, todayIn, type Pause, type PauseScope } from '@homely/shared';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { MemberPicker } from '@/features/members/components/member-picker.tsx';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  Button,
  FormAlert,
  Input,
  SegmentedControl,
  Select,
  Sheet,
  useToast,
} from '@/shared/ui/index.ts';
import { useCreatePause, useUpdatePause } from '../api/pauses.ts';
import { usePlans } from '../api/plans.ts';

type PauseFormSheetProps = {
  open: boolean;
  /** Si viene, se editan sus fechas y razón (el alcance no cambia). */
  pause: Pause | undefined;
  onClose: () => void;
};

export function PauseFormSheet({ open, pause, onClose }: PauseFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={pause ? 'Editar pausa' : 'Pausar planes'}
      description={
        pause
          ? undefined
          : 'Durante estas fechas no se crearán tareas de los planes. Al terminar, todo vuelve solo.'
      }
    >
      {open && <PauseForm pause={pause} onDone={onClose} />}
    </Sheet>
  );
}

const scopeOptions = [
  { value: 'HOUSEHOLD', label: 'Todo el hogar' },
  { value: 'MEMBER', label: 'Una persona' },
  { value: 'PLAN', label: 'Un plan' },
] as const;

function PauseForm({ pause, onDone }: { pause: Pause | undefined; onDone: () => void }) {
  const { household } = useHouseholdSession();
  const plans = usePlans();
  const create = useCreatePause();
  const update = useUpdatePause();
  const toast = useToast();
  const today = todayIn(household.timezone);
  const [scope, setScope] = useState<PauseScope>(pause?.scope ?? 'HOUSEHOLD');
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(createPauseSchema),
    defaultValues: {
      startsOn: pause?.startsOn ?? today,
      endsOn: pause?.endsOn ?? addDays(today, 6),
      memberId: pause?.member?.id ?? null,
      planId: pause?.plan?.id ?? null,
      reason: pause?.reason ?? '',
    },
  });
  const { errors } = form.formState;
  const memberId = useWatch({ control: form.control, name: 'memberId' });
  const planId = useWatch({ control: form.control, name: 'planId' });

  const changeScope = (next: PauseScope) => {
    setScope(next);
    form.setValue('memberId', null);
    form.setValue('planId', null);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (pause) {
        await update.mutateAsync({
          id: pause.id,
          input: {
            startsOn: values.startsOn,
            endsOn: values.endsOn,
            reason: values.reason ?? null,
          },
        });
        toast.show({ message: 'Pausa actualizada', tone: 'success' });
      } else {
        await create.mutateAsync(values);
        toast.show({
          message: 'Planes en pausa. Las tareas de esas fechas se quitaron.',
          tone: 'success',
        });
      }
      onDone();
    } catch (error) {
      setFormError(
        applyApiError(error, form.setError, ['startsOn', 'endsOn', 'memberId', 'planId', 'reason']),
      );
    }
  });

  const activePlans = plans.data?.filter((plan) => plan.isActive) ?? [];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />

      {!pause && (
        <SegmentedControl
          label="¿Qué se pausa?"
          hideLabel={false}
          options={scopeOptions}
          value={scope}
          onChange={changeScope}
        />
      )}

      {!pause && scope === 'MEMBER' && (
        <Controller
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <MemberPicker
              label="Persona"
              value={field.value ?? null}
              onChange={field.onChange}
              noneLabel="Elegir…"
              error={errors.memberId?.message ?? (field.value ? undefined : 'Elige a una persona')}
            />
          )}
        />
      )}

      {!pause && scope === 'PLAN' && (
        <Controller
          control={form.control}
          name="planId"
          render={({ field }) => (
            <Select
              label="Plan"
              value={field.value ?? ''}
              onChange={(event) => field.onChange(event.target.value || null)}
              error={errors.planId?.message}
              options={[
                { value: '', label: 'Elige un plan' },
                ...activePlans.map((plan) => ({ value: plan.id, label: plan.title })),
              ]}
            />
          )}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Desde"
          type="date"
          error={errors.startsOn?.message}
          {...form.register('startsOn')}
        />
        <Input
          label="Hasta"
          type="date"
          error={errors.endsOn?.message}
          {...form.register('endsOn')}
        />
      </div>

      <Input
        label="Motivo (opcional)"
        placeholder="Vacaciones"
        error={errors.reason?.message}
        {...form.register('reason')}
      />

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={create.isPending || update.isPending}
          disabled={!pause && ((scope === 'MEMBER' && !memberId) || (scope === 'PLAN' && !planId))}
        >
          {pause ? 'Guardar cambios' : 'Pausar'}
        </Button>
      </div>
    </form>
  );
}
