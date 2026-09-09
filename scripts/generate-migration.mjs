import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as schema from '../db/schema.ts';

const directory=new URL('../drizzle/',import.meta.url);
mkdirSync(new URL('meta/',directory),{recursive:true});
const journal=JSON.parse(readFileSync(new URL('meta/_journal.json',directory),'utf8'));
const previousEntry=journal.entries.at(-1);
const previous=previousEntry
  ? JSON.parse(readFileSync(new URL(`meta/${String(previousEntry.idx).padStart(4,'0')}_snapshot.json`,directory),'utf8'))
  : await generateSQLiteDrizzleJson({});
const current=await generateSQLiteDrizzleJson(schema,previous.id);
const statements=await generateSQLiteMigration(previous,current);
if(statements.length===0){console.log('Schema unchanged.');process.exit(0);}
const index=previousEntry?previousEntry.idx+1:0;
const prefix=String(index).padStart(4,'0');
const tag=`${prefix}_schema`;
writeFileSync(new URL(`${tag}.sql`,directory),statements.join('\n--> statement-breakpoint\n')+'\n');
writeFileSync(new URL(`meta/${prefix}_snapshot.json`,directory),JSON.stringify(current,null,2)+'\n');
journal.entries.push({idx:index,version:current.version,when:Date.now(),tag,breakpoints:true});
writeFileSync(new URL('meta/_journal.json',directory),JSON.stringify(journal,null,2)+'\n');
console.log(`Generated ${tag}.sql with ${statements.length} statements. Review before applying.`);
