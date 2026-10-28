import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sistema Integrado de Estadística ESFM | Ministerio de Educación de Bolivia',
  description:
    'Portal Estadístico Oficial para la Admisión en las Escuelas Superiores de Formación de Maestros (ESFM). Series DGFM, INE, SIE y SEIE.',
  icons: {
    icon: '/minedu_2025.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-BO" className="h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-[#c9a751]/30 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}
