import { env } from 'cloudflare:workers';
import { ZodError } from 'zod';
import { AppError } from './tickets.ts';

export function database():D1Database { if(!env.DB)throw new AppError(503,'Atendimento temporariamente indisponível. Tente novamente.');return env.DB; }
export async function readBody(request:Request) {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)throw new AppError(403,'Origem não permitida.');
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new AppError(415,'Envie um documento JSON.');
  const reader=request.body?.getReader();if(!reader)throw new AppError(400,'Preencha os dados do chamado.');
  let length=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>20000){await reader.cancel();throw new AppError(413,'O conteúdo enviado é muito grande.');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AppError(400,'JSON inválido.');}
}
export function endpoint(operation:()=>Promise<unknown>,status=200) {
  return operation().then(data=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})).catch(error=>{
    const known=error instanceof AppError;const validation=error instanceof ZodError;
    const code=known?error.status:validation?400:503;
    if(!known&&!validation)console.error('issuedesk.storage_unavailable');
    return Response.json({error:known?error.message:validation?error.issues[0].message:'Não foi possível concluir. Seus dados digitados foram preservados; tente novamente.'},{status:code,headers:{'Cache-Control':'no-store'}});
  });
}
export function ticketId(value:string){const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw new AppError(404,'Chamado não encontrado.');return id;}
