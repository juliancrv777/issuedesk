import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createTicket, editTicket, changeStatus, addComment, detail, listTickets, getTicket } from '../db/ticket-store.ts';
import { AppError } from '../lib/tickets.ts';

// Execute the actual prepared SQL and generated migration in SQLite. This adapter
// models D1's atomic batch; hosted-runtime behavior is checked separately.
function fixture(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  const journal=JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json',import.meta.url),'utf8'));
  for(const entry of journal.entries)sqlite.exec(readFileSync(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),'utf8'));
  class Statement{
    sql:string;values:(string|number)[]=[];
    constructor(sql:string){this.sql=sql;}
    bind(...values:(string|number)[]){this.values=values;return this;}
    execute(){const statement=sqlite.prepare(this.sql);if(statement.columns().length)return {results:statement.all(...this.values),meta:{changes:0}};const result=statement.run(...this.values);return {results:[],meta:{changes:Number(result.changes)}};}
    async first(){return this.execute().results[0]??null;}
    async all(){return this.execute();}
    async run(){return this.execute();}
  }
  const db={prepare:(sql:string)=>new Statement(sql),async batch(statements:Statement[]){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.execute());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
  return {db,sqlite};
}
function input(){return {creation_key:crypto.randomUUID(),title:'Falha no acesso ao painel',description:'O painel exibe um erro ao carregar os relatórios.',requester:'Equipe comercial',assignee:'Ana',priority:'high'};}
const fails=(status:number)=>(error:unknown)=>error instanceof AppError&&error.status===status;

test('creation persists validated fields and one history entry; safe retry does not duplicate',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const data=input();const created=await createTicket(db,data);const replay=await createTicket(db,data);
  assert.equal(created.id,replay.id);assert.equal(created.status,'open');assert.equal((await detail(db,created.id)).activity.length,1);
  await assert.rejects(createTicket(db,{...data,title:'Another valid title'}),fails(409));
});
test('validation rejects blank, oversized and unexpected inputs',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());
  for(const change of [{title:'   '},{description:'x'},{priority:'invalid'},{assignee:'x'.repeat(81)},{unexpected:true}])await assert.rejects(createTicket(db,{...input(),...change}));
  assert.equal((await listTickets(db,new URL('http://local/api/tickets'))).total,0);
});
test('editing checks the version and preserves the successful writer',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const data=input();const original=await createTicket(db,data);const {creation_key,...fields}=data;assert.ok(creation_key);
  const updated=await editTicket(db,original.id,{...fields,title:'Título atualizado corretamente',version:1});
  assert.equal(updated.version,2);
  await assert.rejects(editTicket(db,original.id,{...fields,title:'Uma edição desatualizada',version:1}),fails(409));
  assert.equal((await getTicket(db,original.id)).title,updated.title);assert.equal((await detail(db,original.id)).activity.length,2);
});
test('workflow enforces start before resolve, supports reopening and ignores identical status',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const ticket=await createTicket(db,input());
  await assert.rejects(changeStatus(db,ticket.id,{status:'resolved',version:1}),fails(422));
  await changeStatus(db,ticket.id,{status:'open',version:1});
  assert.equal((await detail(db,ticket.id)).activity.length,1);
  await changeStatus(db,ticket.id,{status:'in_progress',version:1});await changeStatus(db,ticket.id,{status:'resolved',version:2});
  const reopened=await changeStatus(db,ticket.id,{status:'open',version:3});assert.equal(reopened.version,4);assert.equal(reopened.status,'open');
  await assert.rejects(changeStatus(db,ticket.id,{status:'in_progress',version:1}),fails(409));
});
test('comments retain their text and cannot be replayed on a different ticket',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const a=await createTicket(db,input());const b=await createTicket(db,input());const comment={id:crypto.randomUUID(),body:'Acesso corrigido e validado.'};
  await addComment(db,a.id,comment);await addComment(db,a.id,comment);
  assert.equal((await detail(db,a.id)).activity.filter(a=>a.kind==='comment').length,1);
  await assert.rejects(addComment(db,b.id,comment),fails(409));
  await assert.rejects(addComment(db,a.id,{...comment,body:'Texto diferente.'}),fails(409));
});
test('filters, literal wildcard search and statistics use the database',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const a=await createTicket(db,{...input(),title:'Exportação atingiu 100%'});await createTicket(db,{...input(),priority:'low',requester:'Operações'});
  await changeStatus(db,a.id,{status:'in_progress',version:1});
  const filtered=await listTickets(db,new URL('http://local/api/tickets?status=in_progress&priority=high'));
  assert.equal(filtered.total,1);assert.deepEqual(filtered.stats,{open:1,in_progress:1,resolved:0});
  assert.equal((await listTickets(db,new URL('http://local/api/tickets?q=%25'))).total,1);
  assert.equal((await listTickets(db,new URL(`http://local/api/tickets?q=ID-${String(a.id).padStart(4,'0')}`))).data[0].id,a.id);
});
test('pagination is stable and invalid filters are rejected',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());for(let i=0;i<12;i++)await createTicket(db,input());
  const first=await listTickets(db,new URL('http://local/api/tickets'));const second=await listTickets(db,new URL('http://local/api/tickets?page=2'));
  assert.equal(first.data.length,10);assert.equal(second.data.length,2);assert.equal(new Set([...first.data,...second.data].map(t=>t.id)).size,12);
  for(const query of ['page=0','page=x','status=bad','priority=bad'])await assert.rejects(listTickets(db,new URL('http://local/api/tickets?'+query)),fails(400));
});
test('audit failure rolls back a ticket edit',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());const data=input();const original=await createTicket(db,data);const {creation_key,...fields}=data;assert.ok(creation_key);
  sqlite.exec("CREATE TRIGGER fail_history BEFORE INSERT ON activity WHEN NEW.kind='updated' BEGIN SELECT RAISE(ABORT,'injected'); END");
  await assert.rejects(editTicket(db,original.id,{...fields,title:'Alteração que deve falhar',version:1}));
  const saved=await getTicket(db,original.id);assert.equal(saved.title,original.title);assert.equal(saved.version,1);
});
test('missing tickets return 404',async t=>{
  const {db,sqlite}=fixture();t.after(()=>sqlite.close());await assert.rejects(getTicket(db,999),fails(404));await assert.rejects(addComment(db,999,{id:crypto.randomUUID(),body:'Comentário de teste'}),fails(404));
});
