import { Hammer } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/shared/ui/index.ts';

type ComingSoonPageProps = { title: string; phase: number; description: string };

/** Página provisional de un módulo aún no construido. Desaparece cuando llega su fase. */
export function ComingSoonPage({ title, phase, description }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Hammer />}
          title={`Llega en la Fase ${phase}`}
          description={description}
        />
      </Card>
    </>
  );
}
