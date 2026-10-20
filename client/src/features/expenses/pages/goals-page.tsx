import { createGoalSchema, type Goal } from '@homely/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  AmountInput,
  Button,
  Card,
  EmptyState,
  FormAlert,
  PageHeader,
  SegmentedControl,
  Select,
  Sheet,
  Skeleton,
  useToast,
} from '@/shared/ui/index.ts';
import {
  useCategories,
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from '../api/expenses.ts';
import { ExpensesNav } from '../components/expenses-nav.tsx';
import { GoalCard } from '../components/goal-card.tsx';
import { useMoney } from '../lib/use-money.ts';

type FormState = { open: false } | { open: true; goal?: Goal };

/** EX-05: metas opcionales de gasto, por categoría o del total, mensuales o semanales. */
export function GoalsPage() {
  const { isAdmin } = useHouseholdSession();
  const goals = useGoals();
  const [form, setForm] = useState<FormState>({ open: false });
  const newGoalButton = (
    <Button icon={<Plus className="size-4" />} onClick={() => setForm({ open: true })}>
      Nueva meta
    </Button>
  );

  return (
    <>
      <PageHeader title="Gastos" action={isAdmin ? newGoalButton : undefined} />
      <ExpensesNav />

      {goals.isPending ? (
        <Skeleton className="h-40" />
      ) : goals.data?.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target />}
            title="Sin metas"
            description="Las metas son opcionales. Por ejemplo, «Comida: $300 al mes». Te avisaremos al llegar al 80 %."
            action={isAdmin ? newGoalButton : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {goals.data?.map((goal) =>
            isAdmin ? (
              <button
                key={goal.id}
                type="button"
                onClick={() => setForm({ open: true, goal })}
                className="rounded-md border border-line bg-surface p-4 text-left transition-colors md:p-5 hover-pointer:bg-surface-2"
              >
                <GoalCard goal={goal} />
              </button>
            ) : (
              <Card key={goal.id}>
                <GoalCard goal={goal} />
              </Card>
            ),
          )}
          {isAdmin && <div className="md:hidden">{newGoalButton}</div>}
        </div>
      )}

      {isAdmin && (
        <Sheet
          open={form.open}
          onClose={() => setForm({ open: false })}
          title={form.open && form.goal ? 'Editar meta' : 'Nueva meta'}
        >
          {form.open && <GoalForm goal={form.goal} onDone={() => setForm({ open: false })} />}
        </Sheet>
      )}
    </>
  );
}

function GoalForm({ goal, onDone }: { goal: Goal | undefined; onDone: () => void }) {
  const money = useMoney();
  const categories = useCategories();
  const create = useCreateGoal();
  const update = useUpdateGoal();
  const remove = useDeleteGoal();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      categoryId: goal ? (goal.category?.id ?? null) : null,
      period: goal?.period ?? 'MONTHLY',
      amount: goal ? String(Number(goal.amount)) : '',
    },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (goal) {
        await update.mutateAsync({ id: goal.id, input: { amount: values.amount } });
      } else {
        await create.mutateAsync(values);
      }
      toast.show({ message: goal ? 'Meta actualizada' : 'Meta creada', tone: 'success' });
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['categoryId', 'period', 'amount']));
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />

      {goal ? (
        <p className="text-body text-fg-2">
          {goal.category?.name ?? 'Total del hogar'} ·{' '}
          {goal.period === 'MONTHLY' ? 'mensual' : 'semanal'}
        </p>
      ) : (
        <>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select
                label="¿Para qué?"
                value={field.value ?? ''}
                onChange={(event) => field.onChange(event.target.value || null)}
                error={errors.categoryId?.message}
                options={[
                  { value: '', label: 'Total del hogar (todas las categorías)' },
                  ...(categories.data?.map((c) => ({ value: c.id, label: c.name })) ?? []),
                ]}
              />
            )}
          />
          <Controller
            control={form.control}
            name="period"
            render={({ field }) => (
              <SegmentedControl
                label="Periodo"
                hideLabel={false}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'MONTHLY', label: 'Mensual' },
                  { value: 'WEEKLY', label: 'Semanal' },
                ]}
              />
            )}
          />
        </>
      )}

      <AmountInput
        label="Límite"
        currencySymbol={money.symbol}
        error={errors.amount?.message}
        {...form.register('amount')}
      />

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:items-center">
        {goal && (
          <Button
            variant="ghost"
            className="text-danger md:mr-auto"
            icon={<Trash2 className="size-4" />}
            loading={remove.isPending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              remove.mutate(goal.id, {
                onSuccess: () => {
                  toast.show({ message: 'Meta eliminada' });
                  onDone();
                },
                onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
              });
            }}
          >
            {confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar meta'}
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} className={goal ? undefined : 'md:ml-auto'}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending}>
          {goal ? 'Guardar' : 'Crear meta'}
        </Button>
      </div>
    </form>
  );
}
