import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

export const metadata: Metadata = {
  title: 'IronPulse — Workout Tracker & Analytics',
  description:
    'Aplicação completa para rastreamento de treinos, rotinas, recordes pessoais (PRs), 1RM estimado, calculadora de anilhas e mapa muscular.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'IronPulse',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-[#0084FF]/20">
        {children}
      </body>
    </html>
  );
}
