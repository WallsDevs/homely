import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, createExpenseSchema, todayIn, type Expense } from '@homely/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { MemberPicker } from '@/features/members/components/member-picker.tsx';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { cn } from '@/shared/lib/cn.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  AmountInput,
  Button,
  CategoryIcon,
  FormAlert,
  Input,
  Select,
  Sheet,
  Skeleton,
  useToast,
} from '@/shared/ui/index.ts';
import {
  useCategories,
  useCreateExpense,
  useDeleteExpense,
  useUpdateExpense,
} from '../api/expenses.ts';
import { useMoney } from '../lib/use-money.ts';

type ExpenseFormSheetProps = {
  open: boolean;
  expense: Expense | undefined;
  onClose: () => void;
};

export function ExpenseFormSheet({ open, expense, onClose }: ExpenseFormSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={expense ? 'Editar gasto' : 'Nuevo gasto'}>
      {open && <ExpenseForm expense={expense} onDone={onClose} />}
    </Sheet>
  );
}

const paymentOptions = [
  { value: '', label: 'Sin especificar' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];

function ExpenseForm({ expense, onDone }: { expense: Expense | undefined; onDone: () => void }) {
  const { membership, household } = useHouseholdSession();
  const money = useMoney();
  const categories = useCategories();
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();
  const toast = useToast();
  const today = todayIn(household.timezone);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(
    Boolean(expense && (expense.paymentMethod || expense.paidBy?.id !== membership.id)),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      amount: expense ? String(Number(expense.amount)) : '',
      categoryId: expense?.category.id ?? '',
      date: expense?.date ?? today,
      description: expense?.description ?? '',
      paidById: expense ? (expense.paidBy?.id ?? null) : membership.id,
      paymentMethod: expense?.paymentMethod ?? null,
    },
  });
  const { errors } = form.formState;
  const date = useWatch({ control: form.control, name: 'date' });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (expense) {
        await update.mutateAsync({ id: expense.id, input: values });
        toast.show({ message: 'Gasto actualizado', tone: 'success' });
      } else {
        await create.mutateAsync(values);
        toast.show({
          message: `Gasto de ${money.format(values.amount)} guardado`,
          tone: 'success',
        });
      }
      onDone();
    } catch (error) {
      setFormError(
        applyApiError(error, form.setError, [
          'amount',
          'categoryId',
          'date',
          'description',
          'paidById',
          'paymentMethod',
        ]),
      );
    }
  });

  const onDelete = () => {
    if (!expense) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    remove.mutate(expense.id, {
      onSuccess: () => {
        toast.show({ message: 'Gasto eliminado' });
        onDone();
      },
      onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
    });
  };

  const quickDates = [
    { label: 'Hoy', value: today },
    { label: 'Ayer', value: addDays(today, -1) },
  ];

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />

      <AmountInput
        label="Monto"
        currencySymbol={money.symbol}
        // El monto es lo primero que se escribe: el teclado numérico se abre al instante.
        // oxlint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={!expense}
        error={errors.amount?.message}
        {...form.register('amount')}
      />

      <Controller
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-small font-medium text-fg-2">Categoría</legend>
            {categories.isPending ? (
              <Skeleton className="h-20" />
            ) : (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
                {categories.data?.map((category) => {
                  const checked = field.value === category.id;
                  return (
                    <label
                      key={category.id}
                      className={cn(
                        'flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5 rounded-md border px-1 py-2 text-center text-small transition-colors',
                        'has-focus-visible:ring-2 has-focus-visible:ring-accent',
                        checked ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg-2',
                      )}
                    >
                      <input
                        type="radio"
                        name={field.name}
                        checked={checked}
                        onChange={() => field.onChange(category.id)}
                        className="sr-only"
                      />
                      <CategoryIcon icon={category.icon} color={category.color} />
                      <span className="w-full truncate">{category.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            {errors.categoryId && (
              <p className="mt-1 text-small text-danger">Elige una categoría</p>
            )}
          </fieldset>
        )}
      />

      <div className="flex flex-col gap-2">
        <Input label="Fecha" type="date" error={errors.date?.message} {...form.register('date')} />
        <div className="flex gap-2">
          {quickDates.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => form.setValue('date', option.value, { shouldDirty: true })}
              className={cn(
                'h-8 rounded-full border px-3 text-small transition-colors',
                date === option.value
                  ? 'border-accent bg-accent-soft font-medium text-accent'
                  : 'border-line text-fg-2 hover-pointer:bg-surface-2',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Descripción (opcional)"
        placeholder="Mercado semanal, gasolina…"
        error={errors.description?.message}
        {...form.register('description')}
      />

      {showDetails ? (
        <>
          <Controller
            control={form.control}
            name="paidById"
            render={({ field }) => (
              <MemberPicker
                label="¿Quién pagó?"
                value={field.value ?? null}
                onChange={field.onChange}
                noneLabel="No aplica"
                error={errors.paidById?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <Select
                label="Forma de pago"
                options={paymentOptions}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(
                    paymentOptions.find((o) => o.value === event.target.value)?.value || null,
                  )
                }
              />
            )}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetails(true)}
          className="self-start text-small font-medium text-accent"
        >
          + Quién pagó y forma de pago
        </button>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:items-center">
        {expense && (
          <Button
            variant="ghost"
            className="text-danger md:mr-auto"
            icon={<Trash2 className="size-4" />}
            loading={remove.isPending}
            onClick={onDelete}
          >
            {confirmDelete ? 'Toca de nuevo para eliminar' : 'Eliminar'}
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} className={expense ? undefined : 'md:ml-auto'}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" loading={create.isPending || update.isPending}>
          {expense ? 'Guardar cambios' : 'Guardar gasto'}
        </Button>
      </div>
    </form>
  );
}
