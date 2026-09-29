import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function createTicket(page: Page, title: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Novo chamado', exact: true }).first().click();
  const form = page.getByRole('dialog', { name: 'Como podemos ajudar?' });
  await form.getByLabel('Assunto').fill(title);
  await form.getByLabel('Descrição').fill('Solicitação fictícia do teste de navegador.');
  await form.getByLabel('Solicitante').fill('Equipe de teste');
  await form.getByLabel('Responsável').fill('Ana');
  await form.getByRole('button', { name: 'Criar chamado', exact: true }).click();
  await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
}

async function findTicket(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Buscar por assunto, solicitante ou número' }).fill(title);
  await page.getByRole('button').filter({ hasText: title }).click();
  await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
}

test('create, edit, preserve draft, comment, resolve and reload persisted ticket', async ({ page }) => {
  const title = `Fluxo ${crypto.randomUUID()}`;
  const updated = `${title} atualizado`;
  const comment = 'Solução confirmada pelo solicitante.';
  await createTicket(page, title);
  let detail = page.getByRole('dialog', { name: title, exact: true });
  await detail.getByLabel('Adicionar comentário').fill(comment);
  await detail.getByRole('button', { name: 'Editar', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar chamado', exact: true });
  await edit.getByLabel('Assunto').fill(updated);
  await edit.getByRole('button', { name: 'Salvar alterações' }).click();
  detail = page.getByRole('dialog', { name: updated, exact: true });
  await expect(detail.getByLabel('Adicionar comentário')).toHaveValue(comment);
  await detail.getByRole('button', { name: 'Enviar comentário' }).click();
  await expect(detail.getByText(comment, { exact: true })).toHaveCount(1);
  await detail.getByRole('button', { name: 'Iniciar atendimento' }).click();
  await detail.getByRole('button', { name: 'Resolver chamado' }).click();
  await expect(detail.getByRole('button', { name: 'Reabrir chamado' })).toBeVisible();
  await page.reload();
  await findTicket(page, updated);
  await expect(detail.getByText(comment, { exact: true })).toHaveCount(1);
  await expect(detail.getByRole('button', { name: 'Reabrir chamado' })).toBeVisible();
  await detail.getByRole('button', { name: 'Reabrir chamado' }).click();
  await expect(detail.getByRole('button', { name: 'Iniciar atendimento' })).toBeVisible();
  await detail.getByRole('button', { name: 'Fechar detalhes' }).click();
  await page.getByRole('combobox', { name: 'Filtrar por status' }).click();
  await page.getByRole('option', { name: 'Resolvido', exact: true }).click();
  await expect(page.getByText('Nenhum chamado encontrado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await findTicket(page, updated);
});

test('a stale tab cannot overwrite an edit from another tab', async ({ page, context }) => {
  const title = `Conflito ${crypto.randomUUID()}`;
  await createTicket(page, title);
  const other = await context.newPage();
  await other.goto('/');
  await findTicket(other, title);
  await other.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  const firstEdit = page.getByRole('dialog', { name: 'Editar chamado', exact: true });
  await firstEdit.getByLabel('Descrição').fill('Atualização da primeira aba que deve ser preservada.');
  await firstEdit.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(firstEdit).not.toBeVisible();
  const staleEdit = other.getByRole('dialog', { name: 'Editar chamado', exact: true });
  await staleEdit.getByLabel('Descrição').fill('Alteração antiga que não pode sobrescrever os dados.');
  const conflict = other.waitForResponse(response => response.request().method() === 'PATCH');
  await staleEdit.getByRole('button', { name: 'Salvar alterações' }).click();
  expect((await conflict).status()).toBe(409);
  await expect(staleEdit.getByRole('alert')).toBeVisible();
  await expect(staleEdit.getByLabel('Descrição')).toHaveValue('Alteração antiga que não pode sobrescrever os dados.');
  await other.reload();
  await findTicket(other, title);
  await expect(other.getByText('Atualização da primeira aba que deve ser preservada.', { exact: true })).toBeVisible();
  await other.close();
});

test('retry after a lost comment response does not create duplicate history', async ({ page }) => {
  const title = `Reenvio ${crypto.randomUUID()}`;
  const comment = 'Comentário gravado antes da conexão cair.';
  await createTicket(page, title);
  const detail = page.getByRole('dialog', { name: title, exact: true });
  // Commit the real request, then discard only its response to simulate ambiguity.
  await page.route('**/api/tickets/*/comments', async route => {
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('failed');
  }, { times: 1 });
  await detail.getByLabel('Adicionar comentário').fill(comment);
  await detail.getByRole('button', { name: 'Enviar comentário' }).click();
  await expect(detail.getByRole('alert')).toBeVisible();
  await expect(detail.getByLabel('Adicionar comentário')).toHaveValue(comment);
  await detail.getByRole('button', { name: 'Enviar comentário' }).click();
  await expect(detail.getByText(comment, { exact: true })).toHaveCount(1);
  await expect(detail.getByLabel('Adicionar comentário')).toHaveValue('');
  await page.reload();
  await findTicket(page, title);
  await expect(detail.getByText(comment, { exact: true })).toHaveCount(1);
});
