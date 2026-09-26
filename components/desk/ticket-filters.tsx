import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { statuses, priorities } from '@/lib/tickets';
import type { Status, Priority } from '@/lib/tickets';
type Props = {
  query: string;
  status: Status | 'all';
  priority: Priority | 'all';
  onQueryChange: (value: string) => void;
  onStatusChange: (value: Status | 'all') => void;
  onPriorityChange: (value: Priority | 'all') => void;
};
export function TicketFilters({
  query,
  status,
  priority,
  onQueryChange,
  onStatusChange,
  onPriorityChange,
}: Props) {
  return (
    <div className="toolbar">
      <div className="search-field">
        <Search size={18} />
        <Input
          aria-label="Buscar por assunto, solicitante ou número"
          placeholder="Buscar por assunto, solicitante ou número…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          maxLength={120}
        />
      </div>
      <div className="filters">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as Status | 'all')}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statuses).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => onPriorityChange(v as Priority | 'all')}
        >
          <SelectTrigger aria-label="Filtrar por prioridade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {Object.entries(priorities).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
