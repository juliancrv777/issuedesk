import { useCallback, useEffect, useState } from 'react';
import { ticketApi } from '@/lib/ticket-api';
import { errorMessage } from '@/lib/api-client';
import type { TicketDetail } from '@/lib/tickets';

export function useTicketDetail() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<TicketDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError('');
    ticketApi
      .detail(selectedId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSelected(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setDetailError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, revision]);

  function open(id: number) {
    setSelected(null);
    setDetailError('');
    setDetailLoading(true);
    setSelectedId(id);
    refresh();
  }
  function close() {
    setSelectedId(null);
    setSelected(null);
    setDetailError('');
    setDetailLoading(false);
  }
  return {
    selectedId,
    selected,
    detailError,
    setDetailError,
    detailLoading,
    refresh,
    open,
    close,
  };
}
