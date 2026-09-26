import { Inbox, Clock, CheckCircle2 } from 'lucide-react';
import type { Status } from '@/lib/tickets';
export function TicketSummary({ stats }: { stats?: Record<Status, number> }) {
  return (
    <div className="stats">
      {(['open', 'in_progress', 'resolved'] as Status[]).map((s) => (
        <article key={s}>
          <div className="stat-label">
            <span>
              {s === 'open'
                ? 'Novos'
                : s === 'resolved'
                  ? 'Resolvidos'
                  : 'Em andamento'}
            </span>
            {s === 'resolved' ? (
              <CheckCircle2 size={19} />
            ) : s === 'open' ? (
              <Inbox size={19} />
            ) : (
              <Clock size={19} />
            )}
          </div>
          <strong>{stats ? stats[s] : '—'}</strong>
          <p>
            {s === 'open'
              ? 'Aguardando atendimento'
              : s === 'in_progress'
                ? 'Em busca de uma solução'
                : 'Atendimentos concluídos'}
          </p>
        </article>
      ))}
    </div>
  );
}
