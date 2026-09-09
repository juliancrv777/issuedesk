'use client';
import { useState } from 'react';
import { ticketFields, priorities } from '@/lib/tickets';
import type { Ticket, Priority } from '@/lib/tickets';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type Fields={title:string;description:string;requester:string;assignee:string;priority:Priority};
export function TicketForm({ticket,onSave,busy,error}:{ticket?:Ticket;onSave:(input:Fields)=>void;busy:boolean;error:string}) {
  const [fields,setFields]=useState<Fields>(ticket?{title:ticket.title,description:ticket.description,requester:ticket.requester,assignee:ticket.assignee,priority:ticket.priority}:{title:'',description:'',requester:'',assignee:'',priority:'medium'});
  const [validation,setValidation]=useState('');
  function field(key:keyof Fields,value:string){setFields(current=>({...current,[key]:value}));setValidation('');}
  return <form className="ticket-form" onSubmit={event=>{event.preventDefault();const parsed=ticketFields.safeParse(fields);if(!parsed.success){setValidation(parsed.error.issues[0].message);return;}setValidation('');onSave(parsed.data);}}>
    <div className="field"><label htmlFor="ticket-title">Assunto <span>*</span></label><Input id="ticket-title" value={fields.title} onChange={e=>field('title',e.target.value)} required minLength={5} maxLength={120} placeholder="Resuma o que precisa ser resolvido" autoFocus disabled={busy}/></div>
    <div className="field"><label htmlFor="ticket-description">Descrição <span>*</span></label><Textarea id="ticket-description" value={fields.description} onChange={e=>field('description',e.target.value)} required minLength={10} maxLength={5000} rows={4} placeholder="O que aconteceu? Inclua detalhes que ajudem no atendimento." disabled={busy}/></div>
    <div className="form-grid"><div className="field"><label htmlFor="ticket-requester">Solicitante <span>*</span></label><Input id="ticket-requester" value={fields.requester} onChange={e=>field('requester',e.target.value)} required minLength={2} maxLength={80} placeholder="Nome ou equipe" disabled={busy}/></div>
    <div className="field"><label htmlFor="ticket-priority">Prioridade</label><Select value={fields.priority} onValueChange={v=>field('priority',v)} disabled={busy}><SelectTrigger id="ticket-priority" className="w-full"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(priorities).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="field"><label htmlFor="ticket-assignee">Responsável <small>opcional</small></label><Input id="ticket-assignee" value={fields.assignee} onChange={e=>field('assignee',e.target.value)} maxLength={80} placeholder="Quem vai cuidar deste chamado?" disabled={busy}/></div>
    {(validation||error)&&<p className="error-notice" role="alert">{validation||error}</p>}
    <div className="form-actions"><span>Campos com * são obrigatórios</span><Button type="submit" disabled={busy}>{busy?'Salvando…':ticket?'Salvar alterações':'Criar chamado'}</Button></div>
  </form>;
}
