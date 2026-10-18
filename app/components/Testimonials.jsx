import Image from 'next/image';

export default function Testimonials() {
 return <section id="pollinators" className="pollinators chapter" aria-labelledby="pollinator-title">
  <div className="pollinator-heading"><h2 id="pollinator-title">Some seeds<br /><em>were planted by others.</em></h2><p>Notes from people I’ve had the joy of building with.</p></div>
  <div className="pressed-notes">
   <article className="pressed-note note-lilac"><span className="note-pin" aria-hidden="true" /><blockquote>“Manya has a great mix of strategy and design sense. She made it easy for us to turn complex ideas into something clear and scalable.”</blockquote><p><strong>Anshumali Jain</strong><span>Ex-Google, Founder, Celebto</span></p><Image className="pressed-flower" src="/assets/botanical.png" width={160} height={120} alt="" /></article>
   <article className="pressed-note note-butter"><span className="note-tape" aria-hidden="true" /><blockquote>“Dependable and curious, she brings clarity, care, and great energy to every project.”</blockquote><p><strong>Aastha Lathia</strong><span>Co-worker, IIT Delhi</span></p><span className="note-handwriting">good things grow together.</span></article>
   <article className="pressed-note note-rose"><span className="note-pin" aria-hidden="true" /><blockquote>“She instantly understood what the project needed and delivered exactly what we had in mind — reliable, clear, and a joy to work with.”</blockquote><p><strong>Gaurav Giri</strong><span>Client, Freelance</span></p><Image className="pressed-flower small-lotus" src="/assets/lotus.png" width={130} height={110} alt="" /></article>
  </div>
 </section>;
}
