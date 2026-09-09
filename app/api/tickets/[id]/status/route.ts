import { database, endpoint, readBody, ticketId } from '@/lib/api-server';
import { changeStatus } from '@/db/ticket-store';
export function PATCH(request:Request,context:{params:Promise<{id:string}>}){return endpoint(async()=>changeStatus(database(),ticketId((await context.params).id),await readBody(request)));}
