'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { flushSync } from 'react-dom';
import { clientUUID } from '@/lib/client-uuid';
import { z } from 'zod';
import { Inbox,TicketCheck,Plus,Search,SlidersHorizontal,ArrowUpRight,MessageSquare,Clock,CheckCircle2,RotateCcw,RefreshCw,Pencil,UserRound,ChevronLeft,ChevronRight,X,FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogClose } from '@/components/ui/dialog';
import { Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose } from '@/components/ui/sheet';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { Table,TableHeader,TableHead,TableBody,TableRow,TableCell } from '@/components/ui/table';
import { Empty,EmptyHeader,EmptyTitle,EmptyDescription } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { TicketForm } from '@/components/ticket-form';
import type { Fields } from '@/components/ticket-form';
import { statuses,priorities,ticketCode } from '@/lib/tickets';
import type { Ticket,TicketDetail,TicketPage,Status } from '@/lib/tickets';

async function api<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T> {
  const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal,cache:'no-store'});
  const data=await response.json() as T & {error?:string};if(!response.ok)throw new Error(data.error??'Não foi possível concluir. Tente novamente.');return data;
}
const date=(value:number)=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(value);
function StatusBadge({status}:{status:Status}){return <span className={`status-badge status-${status}`}>{status==='resolved'?<CheckCircle2 size={14}/>:<Clock size={14}/>} {statuses[status]}</span>;}
function Loading(){return <div className="loading-list" aria-label="Carregando chamados" role="status">{[1,2,3,4].map(i=><Skeleton key={i} className="h-14 w-full bg-slate-100"/>)}<span className="sr-only">Carregando chamados</span></div>;}

export default function Desk(){
  const [pageData,setPageData]=useState<TicketPage|null>(null);
  const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState('');
  const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [status,setStatus]=useState('all');const [priority,setPriority]=useState('all');const [page,setPage]=useState(1);const [reload,setReload]=useState(0);
  const [formOpen,setFormOpen]=useState(false);const [editing,setEditing]=useState<Ticket>();const [formError,setFormError]=useState('');const [busy,setBusy]=useState(false);const creationKey=useRef('');
  const [selectedId,setSelectedId]=useState<number|null>(null);const [selected,setSelected]=useState<TicketDetail|null>(null);const [detailError,setDetailError]=useState('');const [detailLoading,setDetailLoading]=useState(false);const [detailReload,setDetailReload]=useState(0);
  const [comment,setComment]=useState('');const commentKey=useRef('');
  const refresh=()=>setReload(n=>n+1);
  const openCreate=useCallback(()=>{creationKey.current=clientUUID();setEditing(undefined);setFormError('');setFormOpen(true);},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setSearch(query);setPage(1);},250);return()=>clearTimeout(timer);},[query]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setLoadError('');
    api<TicketPage>(`/api/tickets?${new URLSearchParams({q:search,status,priority,page:String(page)})}`,'GET',undefined,controller.signal)
      .then(setPageData).catch(error=>{if(!controller.signal.aborted)setLoadError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[search,status,priority,page,reload]);
  useEffect(()=>{
    if(selectedId===null){setSelected(null);return;}
    const controller=new AbortController();setDetailLoading(true);setDetailError('');
    api<TicketDetail>(`/api/tickets/${selectedId}`,'GET',undefined,controller.signal).then(setSelected).catch(error=>{if(!controller.signal.aborted)setDetailError(error.message);}).finally(()=>{if(!controller.signal.aborted)setDetailLoading(false);});
    return()=>controller.abort();
  },[selectedId,detailReload]);
  useEffect(()=>{
    type Tool={name:string;title:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
    const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;const controller=new AbortController();
    try{void Promise.resolve(context.registerTool({name:'start_ticket_creation',title:'Abrir novo chamado',description:'Abre o formulário de novo chamado. Não cria nem salva um chamado.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){z.object({}).strict().parse(input);flushSync(()=>openCreate());return {form_open:true,saved:false};}},{signal:controller.signal})).catch(()=>console.warn('Tool registration unavailable'));}catch{console.warn('Tool registration unavailable');}
    return()=>controller.abort();
  },[openCreate]);
  async function save(fields:Fields){
    setBusy(true);setFormError('');
    try{const ticket=await api<Ticket>(editing?`/api/tickets/${editing.id}`:'/api/tickets',editing?'PATCH':'POST',editing?{...fields,version:editing.version}:{...fields,creation_key:creationKey.current});setFormOpen(false);refresh();setSelectedId(ticket.id);setDetailReload(n=>n+1);toast.success(editing?'Chamado atualizado.':'Chamado criado.');}
    catch(error){setFormError((error as Error).message);}finally{setBusy(false);}
  }
  async function move(next:Status){if(!selected)return;setBusy(true);setDetailError('');try{await api(`/api/tickets/${selected.ticket.id}/status`,'PATCH',{status:next,version:selected.ticket.version});refresh();setDetailReload(n=>n+1);toast.success('Status atualizado.');}catch(error){setDetailError((error as Error).message);}finally{setBusy(false);}}
  async function submitComment(event:React.FormEvent){event.preventDefault();if(!selected)return;setBusy(true);setDetailError('');try{if(!commentKey.current)commentKey.current=clientUUID();await api(`/api/tickets/${selected.ticket.id}/comments`,'POST',{body:comment,id:commentKey.current});setComment('');commentKey.current='';setDetailReload(n=>n+1);toast.success('Comentário adicionado.');}catch(error){setDetailError((error as Error).message);}finally{setBusy(false);}}
  async function examples(){setBusy(true);try{await api('/api/examples','POST',{});refresh();toast.success('Chamados de exemplo adicionados.');}catch(error){toast.error((error as Error).message);refresh();}finally{setBusy(false);}}
  const stats=pageData?.stats;const total=stats?stats.open+stats.in_progress+stats.resolved:0;
  const activeFilters=search||status!=='all'||priority!=='all';
  const clear=()=>{setQuery('');setSearch('');setStatus('all');setPriority('all');setPage(1);};
  const showTicket=(id:number)=>{setSelected(null);setSelectedId(id);setComment('');commentKey.current='';};
  return <main className="desk-shell"><a className="skip-link" href="#tickets">Ir para os chamados</a>
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><TicketCheck size={24}/></span>IssueDesk</a><span className="workspace-label">ESPAÇO DE ATENDIMENTO</span><span className="team-chip"><UserRound size={16}/> Equipe de suporte</span></header>
    <section className="workspace"><div className="page-heading"><div><p className="eyebrow">VISÃO GERAL</p><h1>Central de chamados<span>.</span></h1><p className="subtitle">Cada solicitação, do primeiro contato à solução.</p></div><Button className="primary-action" onClick={openCreate}><Plus size={18}/> Novo chamado</Button></div>
      <div className="stats">{(['open','in_progress','resolved'] as Status[]).map(s=><article key={s}><div className="stat-label"><span>{s==='open'?'Novos':s==='resolved'?'Resolvidos':'Em andamento'}</span>{s==='resolved'?<CheckCircle2 size={19}/>:s==='open'?<Inbox size={19}/>:<Clock size={19}/>}</div><strong>{stats?stats[s]:'—'}</strong><p>{s==='open'?'Aguardando atendimento':s==='in_progress'?'Em busca de uma solução':'Atendimentos concluídos'}</p></article>)}</div>
      <section className="ticket-panel" id="tickets"><div className="panel-heading"><div><h2>Fila de atendimento</h2><p>Priorize, acompanhe e resolva.</p></div><Button variant="ghost" size="sm" onClick={refresh} disabled={loading} aria-label="Atualizar chamados"><RefreshCw size={16}/><span className="refresh-text">Atualizar</span></Button></div>
        <div className="toolbar"><div className="search-field"><Search size={18}/><Input aria-label="Buscar por assunto, solicitante ou número" placeholder="Buscar por assunto, solicitante ou número…" value={query} onChange={e=>setQuery(e.target.value)} maxLength={120}/></div><div className="filters"><SlidersHorizontal size={17} aria-hidden="true"/><Select value={status} onValueChange={v=>{setStatus(v);setPage(1);}}><SelectTrigger aria-label="Filtrar por status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{Object.entries(statuses).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select><Select value={priority} onValueChange={v=>{setPriority(v);setPage(1);}}><SelectTrigger aria-label="Filtrar por prioridade"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todas as prioridades</SelectItem>{Object.entries(priorities).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div></div>
        {loadError?<Empty><EmptyHeader><EmptyTitle>Não foi possível carregar os chamados</EmptyTitle><EmptyDescription>{loadError}</EmptyDescription></EmptyHeader><Button variant="outline" onClick={refresh}>Tentar novamente</Button></Empty>:loading?<Loading/>:pageData?.data.length?<>
          <div className="desktop-table"><Table><TableHeader><TableRow><TableHead>Chamado</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead>Responsável</TableHead><TableHead>Aberto em</TableHead><TableHead><span className="sr-only">Abrir</span></TableHead></TableRow></TableHeader><TableBody>{pageData.data.map(t=><TableRow key={t.id}><TableCell><button className="ticket-name" onClick={()=>showTicket(t.id)}><span className="ticket-code">{ticketCode(t.id)}</span><strong>{t.title}</strong><span className="requester">{t.requester}</span></button></TableCell><TableCell><span className={`priority priority-${t.priority}`}><span aria-hidden="true"/>{priorities[t.priority]}</span></TableCell><TableCell><StatusBadge status={t.status}/></TableCell><TableCell><span className="assignee">{t.assignee||'Não atribuído'}</span></TableCell><TableCell><span className="date">{date(t.created_at)}</span></TableCell><TableCell><Button size="icon" variant="ghost" onClick={()=>showTicket(t.id)} aria-label={`Abrir ${ticketCode(t.id)}`}><ArrowUpRight size={17}/></Button></TableCell></TableRow>)}</TableBody></Table></div>
          <div className="mobile-tickets">{pageData.data.map(t=><button key={t.id} className="mobile-ticket" onClick={()=>showTicket(t.id)}><div><span className="ticket-code">{ticketCode(t.id)}</span><span className={`priority priority-${t.priority}`}>{priorities[t.priority]}</span></div><strong>{t.title}</strong><p>{t.requester}</p><div><StatusBadge status={t.status}/><ArrowUpRight size={18}/></div></button>)}</div>
        </>:<Empty className="empty-state"><Inbox size={38}/><EmptyHeader><EmptyTitle>{activeFilters?'Nenhum chamado encontrado':'Sua fila começa aqui'}</EmptyTitle><EmptyDescription>{activeFilters?'Tente outro termo ou remova os filtros.':'Crie seu primeiro chamado ou explore o fluxo com solicitações fictícias.'}</EmptyDescription></EmptyHeader><div className="empty-actions">{activeFilters?<Button variant="outline" onClick={clear}>Limpar filtros</Button>:<><Button onClick={openCreate}><Plus size={16}/> Novo chamado</Button>{total===0&&<Button variant="outline" onClick={examples} disabled={busy}><FlaskConical size={16}/> Carregar exemplos</Button>}</>}</div></Empty>}
        <footer className="list-footer"><span aria-live="polite">{loading?'Carregando…':`${pageData?.total??0} chamado(s) encontrado(s)`}</span><div><Button variant="ghost" size="icon" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)} aria-label="Página anterior"><ChevronLeft size={18}/></Button><span>Página {page}</span><Button variant="ghost" size="icon" disabled={loading||page*10>=(pageData?.total??0)} onClick={()=>setPage(p=>p+1)} aria-label="Próxima página"><ChevronRight size={18}/></Button></div></footer>
      </section><footer className="workspace-footer"><TicketCheck size={15}/><span>IssueDesk</span><span>Organização para cada atendimento.</span></footer>
    </section>
    <Dialog open={formOpen} onOpenChange={open=>{if(!busy)setFormOpen(open);}}><DialogContent className="ticket-dialog sm:max-w-2xl" showCloseButton={false}><DialogHeader><p className="eyebrow">{editing?ticketCode(editing.id):'NOVO ATENDIMENTO'}</p><DialogTitle>{editing?'Editar chamado':'Como podemos ajudar?'}</DialogTitle><DialogDescription>{editing?'Atualize as informações para continuar o atendimento.':'Descreva a solicitação para a equipe de suporte.'}</DialogDescription></DialogHeader><DialogClose asChild><Button variant="ghost" size="icon" className="close-button" disabled={busy} aria-label="Fechar formulário"><X size={19}/></Button></DialogClose><TicketForm key={editing?.id??creationKey.current} ticket={editing} onSave={save} busy={busy} error={formError}/></DialogContent></Dialog>
    <Sheet open={selectedId!==null} onOpenChange={open=>{if(!open&&!busy)setSelectedId(null);}}><SheetContent className="detail-sheet w-full sm:max-w-xl" showCloseButton={false}><SheetHeader className="detail-header"><p className="eyebrow">{selected?ticketCode(selected.ticket.id):'ATENDIMENTO'}</p><SheetTitle>{selected?.ticket.title??'Detalhes do chamado'}</SheetTitle><SheetDescription>Informações e histórico do atendimento.</SheetDescription></SheetHeader><SheetClose asChild><Button size="icon" variant="ghost" className="close-button" disabled={busy} aria-label="Fechar detalhes"><X size={20}/></Button></SheetClose>
      <div className="detail-scroll">{detailError&&<div className="error-notice" role="alert">{detailError}<Button variant="outline" size="sm" onClick={()=>setDetailReload(n=>n+1)} disabled={busy}>Atualizar dados</Button></div>}{detailLoading?<Loading/>:selected&&<>
        <div className="detail-badges"><StatusBadge status={selected.ticket.status}/><span className={`priority priority-${selected.ticket.priority}`}>{priorities[selected.ticket.priority]}</span></div>
        <div className="description-block"><h3>Solicitação</h3><p>{selected.ticket.description}</p></div>
        <dl className="detail-meta"><div><dt>Solicitante</dt><dd>{selected.ticket.requester}</dd></div><div><dt>Responsável</dt><dd>{selected.ticket.assignee||'Não atribuído'}</dd></div><div><dt>Aberto em</dt><dd>{date(selected.ticket.created_at)}</dd></div><div><dt>Atualizado em</dt><dd>{date(selected.ticket.updated_at)}</dd></div></dl>
        <div className="detail-actions"><Button variant="outline" disabled={busy} onClick={()=>{setEditing(selected.ticket);setFormError('');setFormOpen(true);}}><Pencil size={16}/> Editar</Button>{selected.ticket.status==='open'?<Button onClick={()=>move('in_progress')} disabled={busy}><Clock size={16}/> Iniciar atendimento</Button>:selected.ticket.status==='in_progress'?<Button onClick={()=>move('resolved')} disabled={busy}><CheckCircle2 size={16}/> Resolver chamado</Button>:<Button onClick={()=>move('open')} disabled={busy}><RotateCcw size={16}/> Reabrir chamado</Button>}</div>
        <section className="activity"><h3><MessageSquare size={18}/> Histórico do atendimento</h3><ol>{selected.activity.map(item=><li key={item.id} className={item.kind==='comment'?'comment-entry':''}><div className="activity-marker">{item.kind==='comment'?<MessageSquare size={13}/>:<CheckCircle2 size={13}/>}</div><div><div className="activity-meta"><strong>{item.kind==='comment'?'Equipe de suporte':'Atividade'}</strong><time dateTime={new Date(item.created_at).toISOString()}>{date(item.created_at)}</time></div><p>{item.body}</p></div></li>)}</ol></section>
        <form className="comment-form" onSubmit={submitComment}><label htmlFor="comment">Adicionar comentário</label><Textarea id="comment" value={comment} onChange={e=>{setComment(e.target.value);commentKey.current='';}} minLength={2} maxLength={2000} required rows={3} disabled={busy} placeholder="Registre uma atualização ou a solução encontrada…"/><Button type="submit" disabled={busy||comment.trim().length<2}>{busy?'Salvando…':'Enviar comentário'}</Button></form>
      </>}</div></SheetContent></Sheet><Toaster theme="light" position="bottom-right" richColors/>
  </main>;
}
