import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'IssueDesk — Central de chamados', description: 'Organize solicitações, acompanhe prioridades e registre cada atendimento.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="pt-BR"><body>{children}</body></html>; }

