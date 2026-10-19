import About from './components/About';
import Contact from './components/Contact';
import Experiments from './components/Experiments';
import HelianthusScroll from './components/HelianthusScroll';
import Nav from './components/Nav';
import SmoothScroll from './components/SmoothScroll';
import Words from './components/Words';
import Work from './components/Work';

export default function Page() {
  return (
    <SmoothScroll>
      <a href="#main" className="sr-only z-[80] rounded-full bg-ink px-4 py-2 text-paper-light focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <HelianthusScroll />
        <Work />
        <About />
        <Experiments />
        <Words />
        <Contact />
      </main>
    </SmoothScroll>
  );
}
