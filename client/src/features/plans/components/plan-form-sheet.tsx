import { zodResolver } from '@hookform/resolvers/zod';
import { createPlanSchema, type Plan } from '@homely/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MemberPicker } from '@/features/members/components/member-picker.tsx';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  Button,
  FormAlert,
  Input,
  SegmentedControl,
  Sheet,
  Textarea,
  useToast,
  WeekdayChips,
} from '@/shared/ui/index.ts';
import { useCreatePlan, useDeletePlan, useUpdatePlan } from '../api/plans.ts';

type PlanFormSheetProps = {
  open: boolean;
  /** Si viene, se edita; si no, se crea. */
  plan: Plan | undefined;
  onClose: () => void;
};

export function PlanFormSheet({ open, plan, onClose }: PlanFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={plan ? 'Editar plan' : 'Nuevo plan'}
      description="Las tareas se crean solas cada semana en los días que elijas."
    >
      {open && <PlanForm plan={plan} onDone={onClose} />}
    </Sheet>
  );
}

const priorityOptions = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
] as const;

function PlanForm({ plan, onDone }: { plan: Plan | undefined; onDone: () => void }) {
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const remove = useDeletePlan();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(Boolean(plan?.description));
  const [showDates, setShowDates] = useState(Boolean(plan?.startsOn ?? plan?.endsOn));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      title: plan?.title ?? '',
      description: plan?.description ?? '',
      weekdays: plan?.weekdays ?? [],
      assigneeId: plan ? (plan.assignee?.id ?? null) : null,
      priority: plan?.priority ?? 'MEDIUM',
      startsOn: plan?.startsOn ?? '',
      endsOn: plan?.endsOn ?? '',
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (plan) {
        await update.mutateAsync({ id: plan.id, input: values });
        toast.show({
          message: 'Plan actualizado. Las próximas tareas ya se ajustaron.',
          tone: 'success',
        });
      } else {
        await create.mutateAsync(values);
        toast.show({
          message: 'Plan creado. Las tareas de esta semana ya están listas.',
          tone: 'success',
        });
      }
      onDone();
    } catch (error) {
      setFormError(
        applyApiError(error, form.setError, [
          'title',
          'description',
          'weekdays',
          'assigneeId',
          'priority',
          'startsOn',
          'endsOn',
        ]),
      );
    }
  });

  const deletePlan = () => {
    if (!plan) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove.mutate(plan.id, {
      onSuccess: () => {
        toast.show({ message: 'Plan eliminado' });
        onDone();
      },
      onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
    });
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />

      <Input
        label="Tarea"
        placeholder="Sacar la basura"
        // En un diálogo modal el foco debe ir al primer campo, no al botón de cerrar.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={!plan}
        error={errors.title?.message}
        {...form.register('title')}
      />

      <Controller
        control={form.control}
        name="weekdays"
        render={({ field }) => (
          <WeekdayChips
            label="Se repite los"
            value={field.value}
            onChange={field.onChange}
            error={errors.weekdays?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="assigneeId"
        render={({ field }) => (
          <MemberPicker
            label="Responsable"
            value={field.value}
            onChange={field.onChange}
            noneLabel="Nadie fijo"
            error={errors.assigneeId?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="priority"
        render={({ field }) => (
          <SegmentedControl
            label="Prioridad"
            hideLabel={false}
            options={priorityOptions}
            value={field.value ?? 'MEDIUM'}
            onChange={field.onChange}
          />
        )}
      />

      {showNotes ? (
        <Textarea
          label="Notas"
          placeholder="Detalles para quien la haga"
          error={errors.description?.message}
          {...form.register('description')}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNotes(true)}
          className="self-start text-small font-medium text-accent"
        >
          + Añadir notas
        </button>
      )}

      {showDates ? (
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
      ) : (
        <button
          type="button"
          onClick={() => setShowDates(true)}
          className="self-start text-small font-medium text-accent"
        >
          + Limitar a unas fechas
        </button>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:items-center">
        {plan && (
          <Button
            variant="ghost"
            className="text-danger md:mr-auto"
            icon={<Trash2 className="size-4" />}
            loading={remove.isPending}
            onClick={deletePlan}
          >
            {confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar plan'}
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} className={plan ? undefined : 'md:ml-auto'}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending}>
          {plan ? 'Guardar cambios' : 'Crear plan'}
        </Button>
      </div>
    </form>
  );
}
