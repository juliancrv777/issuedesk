import { useCallback, useEffect, useState } from 'react';
import { ticketApi } from '@/lib/ticket-api';
import { errorMessage } from '@/lib/api-client';
import type { TicketPage, Status, Priority } from '@/lib/tickets';

export function useTicketList() {
  const [pageData, setPageData] = useState<TicketPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    ticketApi
      .list({ query: search, status, priority, page }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setPageData(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, status, priority, page, revision]);

  function changeStatus(value: Status | 'all') {
    setStatus(value);
    setPage(1);
  }
  function changePriority(value: Priority | 'all') {
    setPriority(value);
    setPage(1);
  }
  function clear() {
    setQuery('');
    setSearch('');
    setStatus('all');
    setPriority('all');
    setPage(1);
  }

  const stats = pageData?.stats;
  const total = stats ? stats.open + stats.in_progress + stats.resolved : 0;
  return {
    pageData,
    loading,
    loadError,
    query,
    setQuery,
    status,
    priority,
    page,
    setPage,
    refresh,
    changeStatus,
    changePriority,
    clear,
    stats,
    total,
    activeFilters: Boolean(search || status !== 'all' || priority !== 'all'),
  };
}
