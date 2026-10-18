import Image from 'next/image';
import ScrollExperience from './components/ScrollExperience';
import BotanicalResolve from './components/BotanicalResolve';
import Diary from './components/Diary';
import ProjectSpecimens from './components/ProjectSpecimens';
import Testimonials from './components/Testimonials';
import Greenhouse from './components/Greenhouse';

const resume = 'https://drive.google.com/file/d/11IPMfF7LSPDQNFa7S0mrfSV4WnD5PjyU/view?usp=sharing';

export default function PortfolioPage() {
  return (
    <ScrollExperience>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="wordmark" href="#arrival" aria-label="Manya — return to the seed">manya<span aria-hidden="true">✳</span></a>
        <nav aria-label="Main navigation"><a href="#about">About</a><a href="#work">Work</a><a href={resume} target="_blank" rel="noopener noreferrer">Résumé <span aria-hidden="true">↗</span></a></nav>
      </header>
      <main id="main">
        <section id="arrival" className="arrival chapter" data-pinned aria-labelledby="arrival-title">
          <div className="arrival-pin">
            <div className="arrival-copy">
              <h1 id="arrival-title">Welcome to Manya’s<br /><em>thoughts, experiments</em><br />and decision space.</h1>
              <p>A product designer. An eternally curious being.<br />And a garden that grows with every little wander.</p>
              <a className="underlined" href="#work">Skip to the work <span aria-hidden="true">↗</span></a>
            </div>
            <div className="arrival-growth"><BotanicalResolve src="/assets/flowers.png" mode="seed" alt="A seed resolving from ASCII characters into a flowering botanical collage" /></div>
            <div className="arrival-after"><p>Every second,<br /><em>something grows.</em></p><span>Stay curious. Keep going.</span></div>
            <div className="soil-bank" aria-hidden="true"><div className="soil-ascii">. : . · : . . : · . : . · . : . : · . . : . · . : . . · : . : . · . : .</div></div>
            <div className="arrival-bottom"><a href="#about" className="wander-link">Scroll to grow <span aria-hidden="true">↓</span></a><p>A Polymath’s Garden<br /><span>Inspired by Orto Botanico di Padova</span></p><span className="seed-coordinate">One seed. So many possibilities.</span></div>
          </div>
        </section>
        <section id="about" className="canopy chapter" data-pinned aria-labelledby="about-title">
          <div className="canopy-pin">
            <div className="canopy-photo" aria-hidden="true" /><div className="canopy-light" aria-hidden="true" />
            <Image className="branch branch-left" src="/assets/leaves-left.png" width={207} height={335} alt="" />
            <Image className="branch branch-right" src="/assets/leaves-right.png" width={330} height={440} alt="" />
            <div className="canopy-intro"><h2 id="about-title">The person<br /><em>between the pages.</em></h2><p>Hi, I’m Manya. I get a thrill from bringing worlds together.<br />Sometimes that starts with a conversation at home.</p></div>
            <Diary /><span className="canopy-margin-note">a few things that make me, me.</span>
          </div>
        </section>
        <section id="roots" className="roots chapter" aria-labelledby="roots-title">
          <div className="root-surface" aria-hidden="true" />
          <div className="roots-intro"><h2 id="roots-title">To understand the growth,<br /><em>follow the roots.</em></h2><p>Moving from electronics to design taught me<br />how systems and empathy can coexist.</p></div>
          <div className="root-map">
            <svg className="root-lines" viewBox="0 0 800 1100" fill="none" aria-hidden="true" preserveAspectRatio="none">
              <g className="root-trace"><path pathLength="1" d="M400 0 C400 130 180 110 180 230 S550 340 550 470 S210 570 210 700 S490 830 490 1000 L490 1100" /><path pathLength="1" d="M180 230 C90 270 90 330 65 380 M180 230 C250 270 280 300 280 360 M550 470 C650 500 710 560 740 650 M550 470 C480 530 420 540 420 620 M210 700 C100 780 90 830 70 930 M210 700 C290 760 320 810 320 880 M490 1000 C600 1020 650 1050 690 1100" /></g>
              <g className="root-fine"><path d="M65 380 L50 440 M65 380 L100 420 M280 360 L310 410 M740 650 L760 710 M420 620 L400 680 M70 930 L40 1010 M320 880 L350 960 M690 1100 L730 1050" /></g>
            </svg>
            <article className="root-story root-one"><span className="root-dot" /><h3>Electronics.</h3><p>First, I learned to see systems.<br />How the parts connect. What makes things work.</p></article>
            <article className="root-story root-two"><span className="root-dot" /><h3>Posters. Audits.<br /><em>A few more questions.</em></h3><p>College clubs and digital platforms became my first little experiments. How do people think, act, and feel around technology?</p></article>
            <article className="root-story root-three"><span className="root-dot" /><h3>Curiosity found<br /><em>a new direction.</em></h3><p>Interaction Design at the National Institute of Design, Bengaluru. Research, making, failing, unlearning. And trying again.</p></article>
            <article className="root-story root-four"><span className="root-dot" /><h3>And now,<br /><em>connecting worlds.</em></h3><p>Building consumer and enterprise products at <strong>Blinkit</strong>. Bringing people, systems, and design into the same conversation.</p><a className="underlined" href={resume} target="_blank" rel="noopener noreferrer">The résumé version <span aria-hidden="true">↗</span></a></article>
          </div>
          <p className="roots-exit">A little deeper. A little clearer.<br /><em>Back into the light.</em></p>
        </section>
        <section id="work" className="specimens chapter" aria-labelledby="work-title">
          <div className="garden-heading"><h2 id="work-title">Different seeds.<br /><em>Thoughtful outcomes.</em></h2><p>A living collection of work, ideas, and studies.<br />Choose a specimen. Get a little closer.</p></div>
          <ProjectSpecimens />
          <div className="specimen-footer"><p>Science, care, and experimentation.<br /><em>There’s room for all of it here.</em></p><a className="underlined" href="https://manyaa.me/works" target="_blank" rel="noopener noreferrer">The complete work collection <span aria-hidden="true">↗</span></a></div>
        </section>
        <Testimonials />
        <section id="greenhouse" className="greenhouse chapter" aria-labelledby="greenhouse-title">
          <div className="greenhouse-heading"><h2 id="greenhouse-title">A small greenhouse<br /><em>for the “what ifs”.</em></h2><p>Where the rules loosen, ideas cross-pollinate,<br />and making is a way of thinking.</p></div>
          <Greenhouse />
          <div className="greenhouse-links"><a className="underlined" href="https://manyaa.me/playground" target="_blank" rel="noopener noreferrer">More playful things <span aria-hidden="true">↗</span></a><a className="underlined" href="https://medium.com/@manya.manuseema" target="_blank" rel="noopener noreferrer">Thoughts I can’t keep to myself <span aria-hidden="true">↗</span></a></div>
        </section>
        <section id="beyond" className="beyond chapter" data-pinned aria-labelledby="beyond-title">
          <div className="beyond-pin">
            <Image className="hill-photo" src="/assets/hills.webp" fill sizes="100vw" alt="A green rolling hill, wild grasses and daisies beneath a broad blue sky" />
            <div className="hills-atmosphere" aria-hidden="true" />
            <div className="beyond-copy"><h2 id="beyond-title">From 0 → 1 → Beyond.<br /><em>And still becoming...</em></h2><p>A more reflective designer. A better observer.<br />An eternally curious being.</p><blockquote>“Every second you’re there,<br />you’re gaining something.”<cite>— Alysa Liu</cite></blockquote></div>
            <div className="outro-garden" aria-hidden="true"><Image src="/assets/sunflower.png" width={240} height={270} alt="" /><Image src="/assets/flowers.png" width={230} height={267} alt="" /><Image src="/assets/lotus.png" width={200} height={180} alt="" /></div>
            <div className="signoff"><p>Let’s grow something good.</p><a href="mailto:manya.manuseema@gmail.com">Say hello <span aria-hidden="true">↗</span></a><a href={resume} target="_blank" rel="noopener noreferrer">Résumé <span aria-hidden="true">↗</span></a><a href="https://www.linkedin.com/in/manyakaushikprofile/" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a><span className="signature">Signing off,<br /><em>Manya</em></span></div>
            <footer className="garden-footer"><span>© {new Date().getFullYear()} Manya Kaushik</span><span>Rooted in empathy. Always growing.</span><a href="#arrival">Back to the seed ↑</a></footer>
          </div>
        </section>
      </main>
    </ScrollExperience>
  );
}
