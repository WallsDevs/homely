import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, createTaskSchema, todayIn, type Task } from '@homely/shared';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useMembers } from '@/features/members/api/members.ts';
import { cn } from '@/shared/lib/cn.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  Avatar,
  Button,
  FormAlert,
  Input,
  SegmentedControl,
  Sheet,
  Textarea,
  useToast,
} from '@/shared/ui/index.ts';
import { useCreateTask, useUpdateTask } from '../api/tasks.ts';

import type { TaskFormDefaults } from './task-ui.ts';

type TaskFormSheetProps = {
  open: boolean;
  /** Si viene, se edita; si no, se crea. */
  task: Task | undefined;
  defaults: TaskFormDefaults | undefined;
  onClose: () => void;
};

/** TK-01 / TK-02. BottomSheet en móvil, diálogo en escritorio. */
export function TaskFormSheet({ open, task, defaults, onClose }: TaskFormSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Editar tarea' : 'Nueva tarea'}>
      {/* Se monta de nuevo en cada apertura: el formulario arranca limpio. */}
      {open && <TaskForm task={task} defaults={defaults} onDone={onClose} />}
    </Sheet>
  );
}

const priorityOptions = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
] as const;

function TaskForm({
  task,
  defaults,
  onDone,
}: {
  task: Task | undefined;
  defaults: TaskFormDefaults | undefined;
  onDone: () => void;
}) {
  const { membership, household } = useHouseholdSession();
  const members = useMembers();
  const create = useCreateTask();
  const update = useUpdateTask();
  const toast = useToast();
  const today = todayIn(household.timezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(Boolean(task?.description));

  const form = useForm({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      assigneeId:
        task !== undefined ? (task.assignee?.id ?? null) : (defaults?.assigneeId ?? membership.id),
      dueDate: task?.dueDate ?? defaults?.dueDate ?? today,
      priority: task?.priority ?? 'MEDIUM',
    },
  });
  const { errors } = form.formState;
  const dueDate = useWatch({ control: form.control, name: 'dueDate' });

  const save = (keepOpen: boolean) =>
    form.handleSubmit(async (values) => {
      setFormError(null);
      try {
        if (task) {
          await update.mutateAsync({ id: task.id, input: values });
          toast.show({ message: 'Tarea actualizada', tone: 'success' });
        } else {
          await create.mutateAsync(values);
          toast.show({ message: 'Tarea creada', tone: 'success' });
        }
        if (keepOpen) {
          form.reset({ ...values, title: '', description: '' });
          form.setFocus('title');
        } else {
          onDone();
        }
      } catch (error) {
        setFormError(
          applyApiError(error, form.setError, [
            'title',
            'description',
            'assigneeId',
            'dueDate',
            'priority',
          ]),
        );
      }
    });

  const pending = create.isPending || update.isPending;
  const quickDates = [
    { label: 'Hoy', value: today },
    { label: 'Mañana', value: addDays(today, 1) },
  ];

  return (
    <form noValidate onSubmit={save(false)} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />

      <Input
        label="¿Qué hay que hacer?"
        placeholder="Sacar la basura"
        // En un diálogo modal el foco debe ir al primer campo, no al botón de cerrar.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        error={errors.title?.message}
        {...form.register('title')}
      />

      <Controller
        control={form.control}
        name="assigneeId"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-small font-medium text-fg-2">Asignar a</legend>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
              {members.data?.map((member) => (
                <AssigneeChip
                  key={member.id}
                  name={field.name}
                  label={
                    member.id === membership.id ? `${member.displayName} (tú)` : member.displayName
                  }
                  checked={field.value === member.id}
                  onSelect={() => field.onChange(member.id)}
                >
                  <Avatar name={member.displayName} color={member.color} size={32} />
                </AssigneeChip>
              ))}
              <AssigneeChip
                name={field.name}
                label="Sin asignar"
                checked={field.value === null}
                onSelect={() => field.onChange(null)}
              >
                <span className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-line" />
              </AssigneeChip>
            </div>
            {errors.assigneeId && (
              <p className="mt-1 text-small text-danger">{errors.assigneeId.message}</p>
            )}
          </fieldset>
        )}
      />

      <div className="flex flex-col gap-2">
        <Input
          label="Fecha"
          type="date"
          error={errors.dueDate?.message}
          {...form.register('dueDate')}
        />
        <div className="flex gap-2">
          {quickDates.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => form.setValue('dueDate', option.value, { shouldDirty: true })}
              className={cn(
                'h-8 rounded-full border px-3 text-small transition-colors',
                dueDate === option.value
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line text-fg-2 hover-pointer:bg-surface-2',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

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
          placeholder="Detalles, dónde está, cómo hacerlo…"
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

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        {!task && (
          <Button variant="secondary" disabled={pending} onClick={() => void save(true)()}>
            Guardar y crear otra
          </Button>
        )}
        <Button type="submit" loading={pending}>
          {task ? 'Guardar cambios' : 'Crear tarea'}
        </Button>
      </div>
    </form>
  );
}

function AssigneeChip({
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
        'flex w-18 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-center text-caption font-normal tracking-normal transition-colors',
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
