import { database, endpoint, readBody, ticketId } from '@/lib/api-server';
import { addComment } from '@/db/ticket-store';
export function POST(request:Request,context:{params:Promise<{id:string}>}){return endpoint(async()=>addComment(database(),ticketId((await context.params).id),await readBody(request)),201);}
