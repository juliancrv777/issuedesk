import { CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { statuses } from '@/lib/tickets';
import type { Status } from '@/lib/tickets';
export const formatTicketDate = (value: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-${status}`}>
      {status === 'resolved' ? <CheckCircle2 size={14} /> : <Clock size={14} />}{' '}
      {statuses[status]}
    </span>
  );
}
export function TicketLoading() {
  return (
    <div
      className="loading-list"
      aria-label="Carregando chamados"
      role="status"
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-14 w-full bg-slate-100" />
      ))}
      <span className="sr-only">Carregando chamados</span>
    </div>
  );
}
