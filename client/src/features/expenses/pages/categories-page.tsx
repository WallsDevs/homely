import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  createCategorySchema,
  type Category,
} from '@homely/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { cn } from '@/shared/lib/cn.ts';
import { applyApiError } from '@/shared/lib/form-errors.ts';
import {
  Badge,
  Button,
  Card,
  CategoryIcon,
  FormAlert,
  IconButton,
  Input,
  PageHeader,
  Sheet,
  Skeleton,
  Switch,
  useToast,
} from '@/shared/ui/index.ts';
import { CATEGORY_ICON_COMPONENTS } from '@/shared/lib/category-icons.ts';
import {
  useCategories,
  useCreateCategory,
  useReorderCategories,
  useUpdateCategory,
} from '../api/expenses.ts';
import { ExpensesNav } from '../components/expenses-nav.tsx';

type FormState = { open: false } | { open: true; category?: Category };

/** EX-04 (solo admins): crear, editar, ordenar y archivar categorías. */
export function CategoriesPage() {
  const categories = useCategories(true);
  const reorder = useReorderCategories();
  const update = useUpdateCategory();
  const toast = useToast();
  const [form, setForm] = useState<FormState>({ open: false });

  const active = categories.data?.filter((c) => !c.isArchived) ?? [];
  const archived = categories.data?.filter((c) => c.isArchived) ?? [];

  const move = (index: number, delta: -1 | 1) => {
    const ids = active.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids, {
      onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
    });
  };

  const setArchived = (category: Category, isArchived: boolean) =>
    update.mutate(
      { id: category.id, input: { isArchived } },
      {
        onSuccess: () =>
          toast.show({
            message: isArchived ? `«${category.name}» archivada` : `«${category.name}» activa`,
          }),
        onError: (error) => toast.show({ message: errorMessage(error), tone: 'danger' }),
      },
    );

  return (
    <>
      <PageHeader
        title="Gastos"
        action={
          <Button icon={<Plus className="size-4" />} onClick={() => setForm({ open: true })}>
            Nueva categoría
          </Button>
        }
      />
      <ExpensesNav />

      {categories.isPending ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-6">
          <Card className="p-0 md:p-0">
            <ul className="divide-y divide-line">
              {active.map((category, index) => (
                <li key={category.id} className="flex items-center gap-2 py-1.5 pr-2 pl-4">
                  <button
                    type="button"
                    onClick={() => setForm({ open: true, category })}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <CategoryIcon icon={category.icon} color={category.color} />
                    <span className="truncate font-medium">{category.name}</span>
                  </button>
                  <IconButton
                    size="sm"
                    aria-label={`Subir ${category.name}`}
                    icon={<ArrowUp className="size-4" />}
                    disabled={index === 0 || reorder.isPending}
                    onClick={() => move(index, -1)}
                  />
                  <IconButton
                    size="sm"
                    aria-label={`Bajar ${category.name}`}
                    icon={<ArrowDown className="size-4" />}
                    disabled={index === active.length - 1 || reorder.isPending}
                    onClick={() => move(index, 1)}
                  />
                  <Switch
                    checked
                    label={`Archivar ${category.name}`}
                    onChange={() => setArchived(category, true)}
                  />
                </li>
              ))}
            </ul>
          </Card>

          {archived.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-caption text-fg-3 uppercase">Archivadas</h2>
              <Card className="p-0 md:p-0">
                <ul className="divide-y divide-line">
                  {archived.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center gap-3 py-1.5 pr-2 pl-4 opacity-70"
                    >
                      <CategoryIcon icon={category.icon} color={category.color} />
                      <span className="flex-1 truncate">{category.name}</span>
                      <Badge>Archivada</Badge>
                      <Switch
                        checked={false}
                        label={`Reactivar ${category.name}`}
                        onChange={() => setArchived(category, false)}
                      />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
          <p className="px-1 text-small text-fg-3">
            Archivar una categoría la oculta al registrar gastos, pero conserva su historial.
          </p>
        </div>
      )}

      <Sheet
        open={form.open}
        onClose={() => setForm({ open: false })}
        title={form.open && form.category ? 'Editar categoría' : 'Nueva categoría'}
      >
        {form.open && (
          <CategoryForm category={form.category} onDone={() => setForm({ open: false })} />
        )}
      </Sheet>
    </>
  );
}

function CategoryForm({
  category,
  onDone,
}: {
  category: Category | undefined;
  onDone: () => void;
}) {
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: category?.name ?? '',
      color: category?.color ?? CATEGORY_COLORS[0],
      icon: category?.icon ?? 'ellipsis',
    },
  });
  const preview = useWatch({ control: form.control });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (category) await update.mutateAsync({ id: category.id, input: values });
      else await create.mutateAsync(values);
      toast.show({
        message: category ? 'Categoría actualizada' : 'Categoría creada',
        tone: 'success',
      });
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, form.setError, ['name', 'color', 'icon']));
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-2">
      <FormAlert message={formError} />
      <div className="flex items-end gap-3">
        <CategoryIcon
          icon={preview.icon ?? 'ellipsis'}
          color={preview.color ?? CATEGORY_COLORS[0]}
        />
        <Input
          label="Nombre"
          className="flex-1"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
      </div>

      <Controller
        control={form.control}
        name="color"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-small font-medium text-fg-2">Color</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <label
                  key={color}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-surface"
                  style={{ backgroundColor: color }}
                >
                  <input
                    type="radio"
                    name={field.name}
                    checked={field.value === color}
                    onChange={() => field.onChange(color)}
                    aria-label={`Color ${color}`}
                    className="sr-only"
                  />
                  {field.value === color && <Check className="size-4 text-white" aria-hidden />}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />

      <Controller
        control={form.control}
        name="icon"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-small font-medium text-fg-2">Icono</legend>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {CATEGORY_ICONS.map((icon) => {
                const Icon = CATEGORY_ICON_COMPONENTS[icon];
                const checked = field.value === icon;
                return (
                  <label
                    key={icon}
                    className={cn(
                      'flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors',
                      'has-focus-visible:ring-2 has-focus-visible:ring-accent',
                      checked
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line text-fg-2',
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      checked={checked}
                      onChange={() => field.onChange(icon)}
                      aria-label={`Icono ${icon}`}
                      className="sr-only"
                    />
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      />

      <div className="flex flex-col-reverse gap-2 pt-1 md:flex-row md:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending}>
          {category ? 'Guardar' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  );
}
