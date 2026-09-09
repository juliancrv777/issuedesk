import { database, endpoint } from '@/lib/api-server';
export const dynamic='force-dynamic';
export function GET(){return endpoint(async()=>{await database().prepare('SELECT id FROM tickets LIMIT 1').all();return {status:'ok'};});}
