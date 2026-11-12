import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090A0F',
};

export const metadata: Metadata = {
  title: 'IronPulse — Workout Tracker & Analytics',
  description:
    'Aplicação completa para rastreamento de treinos, rotinas, recordes pessoais (PRs), 1RM estimado, calculadora de anilhas e mapa muscular.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
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
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#090A0F] text-slate-100 antialiased selection:bg-[#1D8FE1]/30">
        {children}
      </body>
    </html>
  );
}
