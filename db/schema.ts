import { sqliteTable, integer, text, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creationKey: text('creation_key').notNull().unique(),
  title: text('title').notNull(), description: text('description').notNull(),
  requester: text('requester').notNull(), assignee: text('assignee').notNull().default(''),
  priority: text('priority').notNull(), status: text('status').notNull().default('open'),
  version: integer('version').notNull().default(1),
  updatedAt: integer('updated_at').notNull(), createdAt: integer('created_at').notNull(),
  mutationId: text('mutation_id').notNull(),
}, (t) => [
  index('idx_tickets_status_created').on(t.status, t.createdAt),
  index('idx_tickets_created').on(t.createdAt),
  check('valid_status', sql`${t.status} in ('open','in_progress','resolved')`),
  check('valid_priority', sql`${t.priority} in ('low','medium','high','urgent')`),
]);
export const activity = sqliteTable('activity', {
  id: text('id').primaryKey(), ticketId: integer('ticket_id').notNull().references(() => tickets.id, { onDelete:'cascade' }),
  kind: text('kind').notNull(), body: text('body').notNull(), createdAt: integer('created_at').notNull(),
}, (t) => [index('idx_activity_ticket_created').on(t.ticketId, t.createdAt)]);
