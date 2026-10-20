import { MEMBER_COLORS } from '@homely/shared';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { ThemeSwitcher } from '@/app/layouts/theme-switcher.tsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  IconButton,
  Input,
  PageHeader,
  ProgressBar,
  Sheet,
  Skeleton,
  StatTile,
  useToast,
} from '@/shared/ui/index.ts';

/** Galería del sistema de diseño (solo desarrollo). Revisar a 360 px y 1280 px, claro y oscuro. */
export function DevUiPage() {
  const toast = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <PageHeader title="Sistema de diseño" subtitle="Componentes base de Homely" />

      <div className="flex flex-col gap-8">
        <Section title="Tema">
          <div className="max-w-xs">
            <ThemeSwitcher />
          </div>
        </Section>

        <Section title="Tipografía">
          <div className="flex flex-col gap-2">
            <p className="text-display">Display · $1.240,50</p>
            <p className="text-h1">Heading 1</p>
            <p className="text-h2">Heading 2</p>
            <p className="text-body">Body — Sacar la basura el miércoles y el sábado.</p>
            <p className="text-small text-fg-2">Small — metadatos y labels</p>
            <p className="text-caption text-fg-3 uppercase">Caption</p>
          </div>
        </Section>

        <Section title="Botones">
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<Plus className="size-4" />}>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={<Trash2 className="size-4" />}>
              Eliminar
            </Button>
            <Button loading>Guardando</Button>
            <Button size="sm" variant="secondary">
              Pequeño
            </Button>
            <IconButton aria-label="Buscar" icon={<Search className="size-5" />} />
          </div>
        </Section>

        <Section title="Campos">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Título" placeholder="Sacar la basura" />
            <Input
              label="Monto"
              placeholder="0.00"
              inputMode="decimal"
              prefix="$"
              helper="En la moneda del hogar"
            />
            <Input label="Correo" defaultValue="correo-invalido" error="Escribe un correo válido" />
          </div>
        </Section>

        <Section title="Badges y avatares">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Plan</Badge>
            <Badge tone="success">Hecha</Badge>
            <Badge tone="warning">Aviso</Badge>
            <Badge tone="danger">Vencida</Badge>
            <Badge tone="info">Info</Badge>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {['Iveth', 'Luis Pérez', 'Ana', 'Sofía Gómez'].map((name, index) => (
              <Avatar
                key={name}
                name={name}
                color={MEMBER_COLORS[index] ?? MEMBER_COLORS[0]}
                size={40}
              />
            ))}
          </div>
        </Section>

        <Section title="Estadísticas">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Cumplimiento" value="86 %" delta={{ text: '+5 %', direction: 'up' }} />
            <StatTile label="Completadas" value="12" delta={{ text: '0', direction: 'flat' }} />
            <StatTile
              label="Pendientes"
              value="2"
              delta={{ text: '+1', direction: 'up', positiveIsGood: false }}
            />
            <StatTile
              label="Gasto semana"
              value="$312.50"
              delta={{ text: '−$24.10', direction: 'down', positiveIsGood: false }}
            />
          </div>
          <Card className="mt-4">
            <CardHeader
              title="Meta · Comida"
              subtitle="$265 de $300 este mes"
              action={<Badge tone="warning">88 %</Badge>}
            />
            <ProgressBar value={0.88} tone="warning" label="Progreso de la meta de comida" />
          </Card>
        </Section>

        <Section title="Carga">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </Section>

        <Section title="Superposiciones">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Abrir hoja / diálogo
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show({
                  message: 'Tarea completada',
                  tone: 'success',
                  action: { label: 'Deshacer', onClick: () => toast.show({ message: 'Deshecho' }) },
                })
              }
            >
              Mostrar toast
            </Button>
          </div>
        </Section>
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nuevo gasto"
        description="BottomSheet en móvil, diálogo en escritorio"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setSheetOpen(false)}>Guardar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Monto" inputMode="decimal" prefix="$" placeholder="0.00" />
          <Input label="Descripción" placeholder="Mercado semanal" />
        </div>
      </Sheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-caption text-fg-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}
