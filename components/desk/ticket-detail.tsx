import type { FormEvent } from 'react';
import {
  X,
  Pencil,
  Clock,
  CheckCircle2,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { ticketCode, priorities } from '@/lib/tickets';
import type { Ticket, TicketDetail as Detail, Status } from '@/lib/tickets';
import { TicketLoading, StatusBadge, formatTicketDate } from './ticket-display';
type Props = {
  open: boolean;
  selected: Detail | null;
  detailError: string;
  detailLoading: boolean;
  busy: boolean;
  comment: string;
  onOpenChange: (open: boolean) => void;
  refresh: () => void;
  onEdit: (ticket: Ticket) => void;
  move: (status: Status) => void;
  onCommentChange: (value: string) => void;
  submitComment: (event: FormEvent) => void;
};
export function TicketDetail({
  open,
  selected,
  detailError,
  detailLoading,
  busy,
  comment,
  onOpenChange,
  refresh,
  onEdit,
  move,
  onCommentChange,
  submitComment,
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="detail-sheet w-full sm:max-w-xl"
        showCloseButton={false}
      >
        <SheetHeader className="detail-header">
          <p className="eyebrow">
            {selected ? ticketCode(selected.ticket.id) : 'ATENDIMENTO'}
          </p>
          <SheetTitle>
            {selected?.ticket.title ?? 'Detalhes do chamado'}
          </SheetTitle>
          <SheetDescription>
            Informações e histórico do atendimento.
          </SheetDescription>
        </SheetHeader>
        <SheetClose asChild>
          <Button
            size="icon"
            variant="ghost"
            className="close-button"
            disabled={busy}
            aria-label="Fechar detalhes"
          >
            <X size={20} />
          </Button>
        </SheetClose>
        <div className="detail-scroll">
          {detailError && (
            <div className="error-notice" role="alert">
              {detailError}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={busy}
              >
                Atualizar dados
              </Button>
            </div>
          )}
          {detailLoading ? (
            <TicketLoading />
          ) : (
            selected && (
              <>
                <div className="detail-badges">
                  <StatusBadge status={selected.ticket.status} />
                  <span
                    className={`priority priority-${selected.ticket.priority}`}
                  >
                    {priorities[selected.ticket.priority]}
                  </span>
                </div>
                <div className="description-block">
                  <h3>Solicitação</h3>
                  <p>{selected.ticket.description}</p>
                </div>
                <dl className="detail-meta">
                  <div>
                    <dt>Solicitante</dt>
                    <dd>{selected.ticket.requester}</dd>
                  </div>
                  <div>
                    <dt>Responsável</dt>
                    <dd>{selected.ticket.assignee || 'Não atribuído'}</dd>
                  </div>
                  <div>
                    <dt>Aberto em</dt>
                    <dd>{formatTicketDate(selected.ticket.created_at)}</dd>
                  </div>
                  <div>
                    <dt>Atualizado em</dt>
                    <dd>{formatTicketDate(selected.ticket.updated_at)}</dd>
                  </div>
                </dl>
                <div className="detail-actions">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => onEdit(selected.ticket)}
                  >
                    <Pencil size={16} /> Editar
                  </Button>
                  {selected.ticket.status === 'open' ? (
                    <Button onClick={() => move('in_progress')} disabled={busy}>
                      <Clock size={16} /> Iniciar atendimento
                    </Button>
                  ) : selected.ticket.status === 'in_progress' ? (
                    <Button onClick={() => move('resolved')} disabled={busy}>
                      <CheckCircle2 size={16} /> Resolver chamado
                    </Button>
                  ) : (
                    <Button onClick={() => move('open')} disabled={busy}>
                      <RotateCcw size={16} /> Reabrir chamado
                    </Button>
                  )}
                </div>
                <section className="activity">
                  <h3>
                    <MessageSquare size={18} /> Histórico do atendimento
                  </h3>
                  <ol>
                    {selected.activity.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.kind === 'comment' ? 'comment-entry' : ''
                        }
                      >
                        <div className="activity-marker">
                          {item.kind === 'comment' ? (
                            <MessageSquare size={13} />
                          ) : (
                            <CheckCircle2 size={13} />
                          )}
                        </div>
                        <div>
                          <div className="activity-meta">
                            <strong>
                              {item.kind === 'comment'
                                ? 'Equipe de suporte'
                                : 'Atividade'}
                            </strong>
                            <time
                              dateTime={new Date(item.created_at).toISOString()}
                            >
                              {formatTicketDate(item.created_at)}
                            </time>
                          </div>
                          <p>{item.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <form className="comment-form" onSubmit={submitComment}>
                  <label htmlFor="comment">Adicionar comentário</label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    minLength={2}
                    maxLength={2000}
                    required
                    rows={3}
                    disabled={busy}
                    placeholder="Registre uma atualização ou a solução encontrada…"
                  />
                  <Button
                    type="submit"
                    disabled={busy || comment.trim().length < 2}
                  >
                    {busy ? 'Salvando…' : 'Enviar comentário'}
                  </Button>
                </form>
              </>
            )
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
