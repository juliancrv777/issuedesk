import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { TicketForm } from '@/components/ticket-form';
import { ticketCode } from '@/lib/tickets';
import type { Ticket } from '@/lib/tickets';
import type { TicketFields } from '@/lib/ticket-api';
type Props = {
  formOpen: boolean;
  editing?: Ticket;
  formKey: string | number;
  busy: boolean;
  formError: string;
  onOpenChange: (open: boolean) => void;
  save: (fields: TicketFields) => void;
};
export function TicketFormDialog({
  formOpen,
  editing,
  formKey,
  busy,
  formError,
  onOpenChange,
  save,
}: Props) {
  return (
    <Dialog open={formOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="ticket-dialog sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <p className="eyebrow">
            {editing ? ticketCode(editing.id) : 'NOVO ATENDIMENTO'}
          </p>
          <DialogTitle>
            {editing ? 'Editar chamado' : 'Como podemos ajudar?'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Atualize as informações para continuar o atendimento.'
              : 'Descreva a solicitação para a equipe de suporte.'}
          </DialogDescription>
        </DialogHeader>
        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="close-button"
            disabled={busy}
            aria-label="Fechar formulário"
          >
            <X size={19} />
          </Button>
        </DialogClose>
        <TicketForm
          key={formKey}
          ticket={editing}
          onSave={save}
          busy={busy}
          error={formError}
        />
      </DialogContent>
    </Dialog>
  );
}
