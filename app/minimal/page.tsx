import type { Metadata } from 'next';
import About from '../components/About';
import Contact from '../components/Contact';
import Experiments from '../components/Experiments';
import SunflowerScroll from '../components/SunflowerScroll';
import Nav from '../components/Nav';
import SmoothScroll from '../components/SmoothScroll';
import Words from '../components/Words';
import Work from '../components/Work';

export const metadata: Metadata = {
  title: 'Manya Kaushik — A Polymath’s Garden (minimal)',
};

export default function Page() {
  return (
    <SmoothScroll>
      <a href="#main" className="sr-only z-[80] rounded-full bg-ink px-4 py-2 text-paper-light focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <SunflowerScroll />
        <Work />
        <About />
        <Experiments />
        <Words />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
