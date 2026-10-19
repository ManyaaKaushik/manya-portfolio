import type { Metadata, Viewport } from 'next';
import '@fontsource/instrument-serif/latin-400.css';
import '@fontsource/instrument-serif/latin-400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './globals.css';
import AgentationToolbar from './components/AgentationToolbar';

export const metadata: Metadata = {
  metadataBase: new URL('https://manya-polymaths-garden.tejxv.chatgpt.site'),
  title: 'Manya Kaushik — A Polymath’s Garden',
  description:
    'Manya Kaushik is a product designer at Blinkit, connecting systems, people, and possibility. Step into a garden of thoughtful work and curious experiments.',
};

export const viewport: Viewport = { themeColor: '#f6f4eb' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className="grain" aria-hidden="true" />
        {process.env.NODE_ENV === 'development' && <AgentationToolbar />}
      </body>
    </html>
  );
}
