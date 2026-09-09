import { AppError, createSchema, editSchema, statusSchema, commentSchema, canTransition, statuses } from '../lib/tickets.ts';
import type { Ticket, Activity, Status } from '../lib/tickets.ts';

const columns = 'id, title, description, requester, assignee, priority, status, version, created_at, updated_at';
export async function getTicket(db:D1Database,id:number):Promise<Ticket> {
  const ticket = await db.prepare(`SELECT ${columns} FROM tickets WHERE id=?`).bind(id).first<Ticket>();
  if (!ticket) throw new AppError(404,'Chamado não encontrado.');
  return ticket;
}
export async function detail(db:D1Database,id:number) {
  const ticket=await getTicket(db,id);
  const logs=await db.prepare('SELECT * FROM activity WHERE ticket_id=? ORDER BY created_at,id').bind(id).all<Activity>();
  return {ticket,activity:logs.results};
}
export async function listTickets(db:D1Database,url:URL) {
  const page=Number(url.searchParams.get('page')??1);
  if(!Number.isSafeInteger(page)||page<1||page>10000) throw new AppError(400,'Página inválida.');
  const q=(url.searchParams.get('q')??'').trim();
  if(q.length>120) throw new AppError(400,'Busca muito longa.');
  const status=url.searchParams.get('status')??'all';
  const priority=url.searchParams.get('priority')??'all';
  if(!['all','open','in_progress','resolved'].includes(status)||!['all','low','medium','high','urgent'].includes(priority)) throw new AppError(400,'Filtro inválido.');
  const conditions:string[]=[];const values:(string|number)[]=[];
  if(status!=='all'){conditions.push('status=?');values.push(status);}
  if(priority!=='all'){conditions.push('priority=?');values.push(priority);}
  if(q){conditions.push("(title LIKE ? ESCAPE '\\' OR requester LIKE ? ESCAPE '\\' OR CAST(id AS TEXT)=?)");const escaped=`%${q.replace(/[\\%_]/g,'\\$&')}%`;values.push(escaped,escaped,q.replace(/^ID-0*/i,''));}
  const where=conditions.length?'WHERE '+conditions.join(' AND '):'';
  const [items,count,summary]=await db.batch([
    db.prepare(`SELECT ${columns} FROM tickets ${where} ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET ?`).bind(...values,(page-1)*10),
    db.prepare(`SELECT count(*) AS total FROM tickets ${where}`).bind(...values),
    db.prepare('SELECT status,count(*) AS count FROM tickets GROUP BY status'),
  ]);
  const stats:Record<Status,number>={open:0,in_progress:0,resolved:0};
  for(const row of summary.results as {status:Status;count:number}[])stats[row.status]=row.count;
  return {data:items.results as Ticket[],total:(count.results[0] as {total:number}).total,page,page_size:10,stats};
}
export async function createTicket(db:D1Database,body:unknown) {
  const input=createSchema.parse(body);const now=Date.now();const mutation=crypto.randomUUID();
  // A client-generated key makes retrying a failed connection safe.
  const result=await db.batch([
    db.prepare('INSERT INTO tickets(creation_key,title,description,requester,assignee,priority,status,version,created_at,updated_at,mutation_id) VALUES(?,?,?,?,?,?,\'open\',1,?,?,?) ON CONFLICT(creation_key) DO NOTHING')
      .bind(input.creation_key,input.title,input.description,input.requester,input.assignee,input.priority,now,now,mutation),
    db.prepare("INSERT INTO activity(id,ticket_id,kind,body,created_at) SELECT ?,id,'created','Chamado aberto.',? FROM tickets WHERE creation_key=? AND mutation_id=?")
      .bind(crypto.randomUUID(),now,input.creation_key,mutation),
  ]);
  const existing=await db.prepare(`SELECT ${columns} FROM tickets WHERE creation_key=?`).bind(input.creation_key).first<Ticket>();
  if(!existing)throw new AppError(503,'Não foi possível salvar. Tente novamente.');
  if(!result[0].meta.changes && ['title','description','requester','assignee','priority'].some(k=>existing[k as keyof Ticket]!==input[k as keyof typeof input]))throw new AppError(409,'Este envio já foi usado. Atualize a lista antes de tentar novamente.');
  return existing;
}
export async function editTicket(db:D1Database,id:number,body:unknown) {
  const input=editSchema.parse(body);const now=Date.now();const mutation=crypto.randomUUID();
  const result=await db.batch([
    db.prepare('UPDATE tickets SET title=?,description=?,requester=?,assignee=?,priority=?,version=version+1,updated_at=?,mutation_id=? WHERE id=? AND version=?')
      .bind(input.title,input.description,input.requester,input.assignee,input.priority,now,mutation,id,input.version),
    db.prepare("INSERT INTO activity(id,ticket_id,kind,body,created_at) SELECT ?,id,'updated','Dados do chamado atualizados.',? FROM tickets WHERE id=? AND mutation_id=?")
      .bind(crypto.randomUUID(),now,id,mutation),
  ]);
  if(!result[0].meta.changes){await getTicket(db,id);throw new AppError(409,'Este chamado mudou em outra aba. Atualize os dados antes de salvar.');}
  return getTicket(db,id);
}
export async function changeStatus(db:D1Database,id:number,body:unknown) {
  const input=statusSchema.parse(body);const current=await getTicket(db,id);
  if(current.version!==input.version)throw new AppError(409,'Este chamado mudou em outra aba. Atualize os dados.');
  if(!canTransition(current.status,input.status))throw new AppError(422,'Inicie o atendimento antes de resolver o chamado.');
  if(current.status===input.status)return current;
  const now=Date.now();const mutation=crypto.randomUUID();
  const result=await db.batch([
    db.prepare('UPDATE tickets SET status=?,version=version+1,updated_at=?,mutation_id=? WHERE id=? AND version=?')
      .bind(input.status,now,mutation,id,input.version),
    db.prepare("INSERT INTO activity(id,ticket_id,kind,body,created_at) SELECT ?,id,'status',?,? FROM tickets WHERE id=? AND mutation_id=?")
      .bind(crypto.randomUUID(),`${statuses[current.status]} → ${statuses[input.status]}`,now,id,mutation),
  ]);
  if(!result[0].meta.changes)throw new AppError(409,'Este chamado mudou em outra aba. Atualize os dados.');
  return getTicket(db,id);
}
export async function addComment(db:D1Database,id:number,body:unknown) {
  const input=commentSchema.parse(body);await getTicket(db,id);
  await db.prepare("INSERT INTO activity(id,ticket_id,kind,body,created_at) VALUES(?,?,'comment',?,?) ON CONFLICT(id) DO NOTHING")
    .bind(input.id,id,input.body,Date.now()).run();
  const saved=await db.prepare('SELECT * FROM activity WHERE id=?').bind(input.id).first<Activity>();
  if(!saved||saved.ticket_id!==id||saved.body!==input.body)throw new AppError(409,'Identificador de comentário já utilizado.');
  return saved;
}
