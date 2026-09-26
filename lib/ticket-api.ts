import { request } from './api-client';
import type {
  Ticket,
  TicketDetail,
  TicketPage,
  Status,
  Priority,
  Activity,
} from './tickets';

export type TicketFields = Pick<
  Ticket,
  'title' | 'description' | 'requester' | 'assignee' | 'priority'
>;
export type TicketFilters = {
  query: string;
  status: Status | 'all';
  priority: Priority | 'all';
  page: number;
};

export const ticketApi = {
  list(filters: TicketFilters, signal?: AbortSignal) {
    const params = new URLSearchParams({
      q: filters.query,
      status: filters.status,
      priority: filters.priority,
      page: String(filters.page),
    });
    return request<TicketPage>(`/api/tickets?${params}`, { signal });
  },
  detail(id: number, signal?: AbortSignal) {
    return request<TicketDetail>(`/api/tickets/${id}`, { signal });
  },
  create(fields: TicketFields, creationKey: string) {
    return request<Ticket>('/api/tickets', {
      method: 'POST',
      body: { ...fields, creation_key: creationKey },
    });
  },
  edit(ticket: Ticket, fields: TicketFields) {
    return request<Ticket>(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      body: { ...fields, version: ticket.version },
    });
  },
  changeStatus(ticket: Ticket, status: Status) {
    return request<Ticket>(`/api/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      body: { status, version: ticket.version },
    });
  },
  comment(ticketId: number, body: string, id: string) {
    return request<Activity>(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: { body, id },
    });
  },
  examples() {
    return request<{ created: number }>('/api/examples', {
      method: 'POST',
      body: {},
    });
  },
};
