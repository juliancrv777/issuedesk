'use client';
import { Plus, RefreshCw, TicketCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useTicketWorkspace } from '@/hooks/use-ticket-workspace';
import { TicketSummary } from './desk/ticket-summary';
import { TicketFilters } from './desk/ticket-filters';
import { TicketList } from './desk/ticket-list';
import { TicketFormDialog } from './desk/ticket-form-dialog';
import { TicketDetail } from './desk/ticket-detail';

export default function Desk() {
  const workspace = useTicketWorkspace();
  const { list, detail } = workspace;
  return (
    <main className="desk-shell">
      <a className="skip-link" href="#tickets">
        Ir para os chamados
      </a>
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">
            <TicketCheck size={24} />
          </span>
          IssueDesk
        </a>
        <span className="workspace-label">ESPAÇO DE ATENDIMENTO</span>
        <span className="team-chip">
          <UserRound size={16} /> Equipe de suporte
        </span>
      </header>
      <section className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">VISÃO GERAL</p>
            <h1>
              Central de chamados<span>.</span>
            </h1>
            <p className="subtitle">
              Cada solicitação, do primeiro contato à solução.
            </p>
          </div>
          <Button className="primary-action" onClick={workspace.openCreate}>
            <Plus size={18} /> Novo chamado
          </Button>
        </div>
        <TicketSummary stats={list.stats} />
        <section className="ticket-panel" id="tickets">
          <div className="panel-heading">
            <div>
              <h2>Fila de atendimento</h2>
              <p>Priorize, acompanhe e resolva.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={list.refresh}
              disabled={list.loading}
              aria-label="Atualizar chamados"
            >
              <RefreshCw size={16} />
              <span className="refresh-text">Atualizar</span>
            </Button>
          </div>
          <TicketFilters
            query={list.query}
            status={list.status}
            priority={list.priority}
            onQueryChange={list.setQuery}
            onStatusChange={list.changeStatus}
            onPriorityChange={list.changePriority}
          />
          <TicketList
            pageData={list.pageData}
            loading={list.loading}
            loadError={list.loadError}
            page={list.page}
            activeFilters={list.activeFilters}
            total={list.total}
            busy={workspace.busy}
            refresh={list.refresh}
            showTicket={workspace.showTicket}
            clear={list.clear}
            openCreate={workspace.openCreate}
            examples={workspace.examples}
            onPageChange={list.setPage}
          />
        </section>
        <footer className="workspace-footer">
          <TicketCheck size={15} />
          <span>IssueDesk</span>
          <span>Organização para cada atendimento.</span>
        </footer>
      </section>
      <TicketFormDialog
        formOpen={workspace.formOpen}
        editing={workspace.editing}
        formKey={workspace.formKey}
        busy={workspace.busy}
        formError={workspace.formError}
        onOpenChange={workspace.changeFormOpen}
        save={workspace.save}
      />
      <TicketDetail
        open={detail.selectedId !== null}
        selected={detail.selected}
        detailError={detail.detailError}
        detailLoading={detail.detailLoading}
        busy={workspace.busy}
        comment={workspace.comment}
        onOpenChange={workspace.changeDetailOpen}
        refresh={detail.refresh}
        onEdit={workspace.openEdit}
        move={workspace.move}
        onCommentChange={workspace.changeComment}
        submitComment={workspace.submitComment}
      />
      <Toaster theme="light" position="bottom-right" richColors />
    </main>
  );
}
