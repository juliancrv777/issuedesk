import { z } from 'zod';

export const statuses = { open: 'Novo', in_progress: 'Em andamento', resolved: 'Resolvido' } as const;
export const priorities = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' } as const;
export type Status = keyof typeof statuses;
export type Priority = keyof typeof priorities;
export type Ticket = { id:number; title:string; description:string; requester:string; assignee:string; status:Status; priority:Priority; version:number; created_at:number; updated_at:number };
export type Activity = { id:string; ticket_id:number; kind:'created'|'updated'|'status'|'comment'; body:string; created_at:number };
export type TicketDetail = { ticket:Ticket; activity:Activity[] };
export type TicketPage = { data:Ticket[]; total:number; page:number; page_size:number; stats:Record<Status,number> };

const text = (min:number,max:number,label:string) => z.string().trim().min(min, `${label}: mínimo de ${min} caracteres.`).max(max, `${label}: máximo de ${max} caracteres.`);
export const ticketFields = z.object({
  title:text(5,120,'Assunto'), description:text(10,5000,'Descrição'), requester:text(2,80,'Solicitante'),
  assignee:z.string().trim().max(80,'Responsável: máximo de 80 caracteres.').default(''),
  priority:z.enum(['low','medium','high','urgent']),
});
export const createSchema = ticketFields.extend({ creation_key:z.string().uuid() }).strict();
export const editSchema = ticketFields.extend({ version:z.number().int().positive() }).strict();
export const statusSchema = z.object({ status:z.enum(['open','in_progress','resolved']), version:z.number().int().positive() }).strict();
export const commentSchema = z.object({ body:text(2,2000,'Comentário'), id:z.string().uuid() }).strict();
export const transitions:Record<Status,Status[]> = { open:['in_progress'], in_progress:['open','resolved'], resolved:['open'] };
export function ticketCode(id:number) { return `ID-${String(id).padStart(4,'0')}`; }
export class AppError extends Error {
  status:number;
  constructor(status:number,message:string) { super(message); this.status=status; }
}
export function canTransition(from:Status,to:Status) { return from===to || transitions[from].includes(to); }
