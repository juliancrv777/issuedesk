import { database, endpoint, readBody, ticketId } from '@/lib/api-server';
import { detail, editTicket } from '@/db/ticket-store';
type Context={params:Promise<{id:string}>};
export const dynamic='force-dynamic';
export function GET(_request:Request,context:Context){return endpoint(async()=>detail(database(),ticketId((await context.params).id)));}
export function PATCH(request:Request,context:Context){return endpoint(async()=>editTicket(database(),ticketId((await context.params).id),await readBody(request)));}
