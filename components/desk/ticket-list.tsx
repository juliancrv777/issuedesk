import {
  Inbox,
  Plus,
  FlaskConical,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { priorities, ticketCode } from '@/lib/tickets';
import type { TicketPage } from '@/lib/tickets';
import { TicketLoading, StatusBadge, formatTicketDate } from './ticket-display';
type Props = {
  pageData: TicketPage | null;
  loading: boolean;
  loadError: string;
  page: number;
  activeFilters: boolean;
  total: number;
  busy: boolean;
  refresh: () => void;
  showTicket: (id: number) => void;
  clear: () => void;
  openCreate: () => void;
  examples: () => void;
  onPageChange: (page: number) => void;
};
export function TicketList({
  pageData,
  loading,
  loadError,
  page,
  activeFilters,
  total,
  busy,
  refresh,
  showTicket,
  clear,
  openCreate,
  examples,
  onPageChange,
}: Props) {
  return (
    <>
      {loadError ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Não foi possível carregar os chamados</EmptyTitle>
            <EmptyDescription>{loadError}</EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={refresh}>
            Tentar novamente
          </Button>
        </Empty>
      ) : loading ? (
        <TicketLoading />
      ) : pageData?.data.length ? (
        <>
          <div className="desktop-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chamado</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Aberto em</TableHead>
                  <TableHead>
                    <span className="sr-only">Abrir</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <button
                        className="ticket-name"
                        onClick={() => showTicket(t.id)}
                      >
                        <span className="ticket-code">{ticketCode(t.id)}</span>
                        <strong>{t.title}</strong>
                        <span className="requester">{t.requester}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className={`priority priority-${t.priority}`}>
                        <span aria-hidden="true" />
                        {priorities[t.priority]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <span className="assignee">
                        {t.assignee || 'Não atribuído'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="date">
                        {formatTicketDate(t.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => showTicket(t.id)}
                        aria-label={`Abrir ${ticketCode(t.id)}`}
                      >
                        <ArrowUpRight size={17} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mobile-tickets">
            {pageData.data.map((t) => (
              <button
                key={t.id}
                className="mobile-ticket"
                onClick={() => showTicket(t.id)}
              >
                <div>
                  <span className="ticket-code">{ticketCode(t.id)}</span>
                  <span className={`priority priority-${t.priority}`}>
                    {priorities[t.priority]}
                  </span>
                </div>
                <strong>{t.title}</strong>
                <p>{t.requester}</p>
                <div>
                  <StatusBadge status={t.status} />
                  <ArrowUpRight size={18} />
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <Empty className="empty-state">
          <Inbox size={38} />
          <EmptyHeader>
            <EmptyTitle>
              {activeFilters
                ? 'Nenhum chamado encontrado'
                : 'Sua fila começa aqui'}
            </EmptyTitle>
            <EmptyDescription>
              {activeFilters
                ? 'Tente outro termo ou remova os filtros.'
                : 'Crie seu primeiro chamado ou explore o fluxo com solicitações fictícias.'}
            </EmptyDescription>
          </EmptyHeader>
          <div className="empty-actions">
            {activeFilters ? (
              <Button variant="outline" onClick={clear}>
                Limpar filtros
              </Button>
            ) : (
              <>
                <Button onClick={openCreate}>
                  <Plus size={16} /> Novo chamado
                </Button>
                {total === 0 && (
                  <Button variant="outline" onClick={examples} disabled={busy}>
                    <FlaskConical size={16} /> Carregar exemplos
                  </Button>
                )}
              </>
            )}
          </div>
        </Empty>
      )}
      <footer className="list-footer">
        <span aria-live="polite">
          {loading
            ? 'Carregando…'
            : `${pageData?.total ?? 0} chamado(s) encontrado(s)`}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1 || loading}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </Button>
          <span>Página {page}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={loading || page * 10 >= (pageData?.total ?? 0)}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight size={18} />
          </Button>
        </div>
      </footer>
    </>
  );
}
