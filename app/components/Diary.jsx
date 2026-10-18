'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function Diary() {
  const [page, setPage] = useState(0);
  return (
    <div className="diary">
      <div className="book-spread" key={page}>
        <div className="book-page book-left">
          <span className="diary-date">Notes on being human</span>
          {page === 0 ? <><h3>My favourite kind<br />of connection.</h3><p>If you’d asked my Grandma, she’d say I taught her how to shop from Amazon. If you ask my Mom, she’d say I helped her unlock Smart TV’s magic.</p><figure className="diary-photo grandma"><Image src="/assets/family-grandma.webp" width={230} height={300} alt="Manya’s grandma at a café" /><figcaption>little lessons, over a big conversation.</figcaption></figure><span className="paper-sticker sticker-care">design starts<br /><em>with care.</em></span></> : <><h3>Who am I without<br /><em>the things I love?</em></h3><p>Dance. Singing. Travel. Writing. The film I can’t stop thinking about. A good story that makes the world feel a little bigger.</p><div className="love-stickers"><span>meme reference<br />enthusiast</span><span>one more<br /><em>“what if?”</em></span><span>tiny worlds,<br />big feelings</span><span>always taking<br />the scenic route</span></div><p className="diary-handwriting">90% of my conversations<br />are meme / movie references.</p></>}
        </div>
        <div className="book-page book-right">
          {page === 0 ? <><figure className="diary-photo together"><Image src="/assets/family-together.webp" width={350} height={263} alt="Manya and her grandma sharing a ride" /><figcaption>bringing worlds together, one day at a time.</figcaption></figure><h3>A curious being,<br /><em>still becoming.</em></h3><p>With classmates, you’ll find me talking about designing with AI or design in everyday life. Human–AI collaboration or cross-generational tech lessons — I love the space in between.</p><span className="hand-note">small frictions.<br />human possibilities.</span></> : <><div className="diary-portrait"><Image src="/assets/manya.webp" width={200} height={300} alt="Manya, a curious being" /><span className="paper-sticker">jolly, mostly.</span></div><h3>I turn wild dreams<br /><em>into stories.</em></h3><p>And sometimes into experiments, prototypes, photographs, and thoughts on Medium. The garden is never really finished.</p><a className="underlined" href="https://medium.com/@manya.manuseema" target="_blank" rel="noopener noreferrer">Read a thought <span aria-hidden="true">↗</span></a></>}
          <span className="page-number">{page * 2 + 2}</span>
        </div>
        <div className="book-binding" aria-hidden="true" />
      </div>
      <div className="diary-controls"><button onClick={() => setPage(p => 1 - p)} aria-label="Previous diary spread">←</button><span>{page === 0 ? 'The connections that shape me' : 'A few things I love'}</span><button onClick={() => setPage(p => 1 - p)} aria-label="Next diary spread">Turn a page <span aria-hidden="true">→</span></button></div>
    </div>
  );
}
