import type { Metadata } from 'next';
import { Providers } from '@/_app/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wildberries SERP Analytics — Мониторинг поисковой выдачи',
  description: 'Регулярный сбор поисковой выдачи Wildberries по 70 запросам, история позиций топ-200 и сравнение динамики.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full bg-zinc-950 text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
