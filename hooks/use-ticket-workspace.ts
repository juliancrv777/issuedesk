import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { clientUUID } from '@/lib/client-uuid';
import { errorMessage } from '@/lib/api-client';
import { ticketApi } from '@/lib/ticket-api';
import type { TicketFields } from '@/lib/ticket-api';
import type { Status, Ticket } from '@/lib/tickets';
import { useTicketList } from './use-ticket-list';
import { useTicketDetail } from './use-ticket-detail';
import { useTicketTool } from './use-ticket-tool';

export function useTicketWorkspace() {
  const list = useTicketList();
  const detail = useTicketDetail();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket>();
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState('');
  const creationKey = useRef('');
  const commentKey = useRef('');

  const openCreate = useCallback(() => {
    creationKey.current = clientUUID();
    setEditing(undefined);
    setFormError('');
    setFormOpen(true);
  }, []);
  useTicketTool(openCreate);

  function openEdit(ticket: Ticket) {
    setEditing(ticket);
    setFormError('');
    setFormOpen(true);
  }
  function changeComment(value: string) {
    setComment(value);
    commentKey.current = '';
  }
  function showTicket(id: number) {
    changeComment('');
    detail.open(id);
  }
  function changeFormOpen(open: boolean) {
    if (!busy) setFormOpen(open);
  }
  function changeDetailOpen(open: boolean) {
    if (!open && !busy) detail.close();
  }

  async function save(fields: TicketFields) {
    setBusy(true);
    setFormError('');
    try {
      const ticket = editing
        ? await ticketApi.edit(editing, fields)
        : await ticketApi.create(fields, creationKey.current);
      setFormOpen(false);
      list.refresh();
      if (detail.selectedId !== ticket.id) changeComment('');
      detail.open(ticket.id);
      toast.success(editing ? 'Chamado atualizado.' : 'Chamado criado.');
    } catch (error) {
      // Keep the form and its retry key intact after a failed submission.
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function move(next: Status) {
    if (!detail.selected) return;
    setBusy(true);
    detail.setDetailError('');
    try {
      await ticketApi.changeStatus(detail.selected.ticket, next);
      list.refresh();
      detail.refresh();
      toast.success('Status atualizado.');
    } catch (error) {
      detail.setDetailError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!detail.selected) return;
    setBusy(true);
    detail.setDetailError('');
    try {
      // Reuse this identifier when retrying the same text after a network failure.
      if (!commentKey.current) commentKey.current = clientUUID();
      await ticketApi.comment(
        detail.selected.ticket.id,
        comment,
        commentKey.current,
      );
      changeComment('');
      detail.refresh();
      toast.success('Comentário adicionado.');
    } catch (error) {
      detail.setDetailError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function examples() {
    setBusy(true);
    try {
      await ticketApi.examples();
      toast.success('Chamados de exemplo adicionados.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      list.refresh();
      setBusy(false);
    }
  }
  return {
    list,
    detail,
    formOpen,
    editing,
    formError,
    busy,
    comment,
    formKey: editing?.id ?? creationKey.current,
    openCreate,
    openEdit,
    changeComment,
    showTicket,
    changeFormOpen,
    changeDetailOpen,
    save,
    move,
    submitComment,
    examples,
  };
}
