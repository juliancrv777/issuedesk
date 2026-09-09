import { database, endpoint, readBody } from '@/lib/api-server';
import { createTicket, listTickets } from '@/db/ticket-store';
export const dynamic='force-dynamic';
export function GET(request:Request){return endpoint(()=>listTickets(database(),new URL(request.url)));}
export function POST(request:Request){return endpoint(async()=>createTicket(database(),await readBody(request)),201);}
