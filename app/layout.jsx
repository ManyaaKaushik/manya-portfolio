import 'lenis/dist/lenis.css';
import './world.css';
import './collections.css';
import './responsive.css';

export const metadata = {
  metadataBase: new URL('https://manya-polymaths-garden.tejxv.chatgpt.site'),
  title: 'Manya Kaushik — A Polymath’s Garden',
  description: 'Manya Kaushik is a product designer connecting systems, people, and possibility. Step into a garden of thoughtful work and curious experiments.',
};

export const viewport = { themeColor: '#f5f4ec' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/assets/fonts/jizBRFtNs2ka5fXjeivQ4LroWlx-6zUTjg.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
