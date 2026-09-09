import { database,endpoint,readBody } from '@/lib/api-server';
import { createTicket,changeStatus } from '@/db/ticket-store';
import { AppError } from '@/lib/tickets';
const examples=[
  ['Acesso ao painel financeiro indisponível','Ao abrir o painel, a página informa que o acesso foi negado. Solicitação fictícia para explorar o atendimento.','Equipe financeira','urgent','Ana'],
  ['Impressora do escritório não conecta','A impressora aparece offline mesmo conectada à rede. Solicitação fictícia para explorar o atendimento.','Operações','high','Lucas'],
  ['Atualizar cadastro de fornecedor','Precisamos corrigir os dados do cadastro antes do próximo pedido. Solicitação fictícia para explorar o atendimento.','Compras','medium',''],
  ['Relatório mensal com valores divergentes','Os totais do relatório não correspondem ao período selecionado. Solicitação fictícia para explorar o atendimento.','Gestão','high','Ana'],
  ['Orientação para configurar assinatura','Gostaria de orientação para configurar a assinatura de e-mail. Solicitação fictícia para explorar o atendimento.','Comunicação','low','Lucas'],
  ['Exportação da lista de produtos','A exportação encerra antes de concluir o arquivo. Solicitação fictícia para explorar o atendimento.','Comercial','medium',''],
] as const;
export function POST(request:Request){return endpoint(async()=>{
  await readBody(request);const db=database();const count=await db.prepare('SELECT COUNT(*) AS n FROM tickets').first<{n:number}>();
  if(count?.n)throw new AppError(409,'Os exemplos só podem ser carregados em uma fila vazia.');
  for(let i=0;i<examples.length;i++){
    const [title,description,requester,priority,assignee]=examples[i];
    const ticket=await createTicket(db,{title,description,requester,priority,assignee,creation_key:`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`});
    if([1,3,4].includes(i)){const updated=await changeStatus(db,ticket.id,{status:'in_progress',version:ticket.version});if(i===4)await changeStatus(db,ticket.id,{status:'resolved',version:updated.version});}
  }
  return {created:examples.length};
},201);}
