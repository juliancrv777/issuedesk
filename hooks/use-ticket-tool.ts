import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { z } from 'zod';

export function useTicketTool(openCreate: () => void) {
  useEffect(() => {
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_ticket_creation',
            title: 'Abrir novo chamado',
            description:
              'Abre o formulário de novo chamado. Não cria nem salva um chamado.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input) {
              z.object({}).strict().parse(input);
              flushSync(() => openCreate());
              return { form_open: true, saved: false };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => console.warn('Tool registration unavailable'));
    } catch {
      console.warn('Tool registration unavailable');
    }
    return () => controller.abort();
  }, [openCreate]);
}
