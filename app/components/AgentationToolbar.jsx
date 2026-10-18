'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const Agentation = process.env.NODE_ENV === 'development'
  ? dynamic(
      () => import('agentation').then(module => module.Agentation),
      { ssr: false }
    )
  : () => null;

export default function AgentationToolbar() {
  const [portalContainer, setPortalContainer] = useState(null);

  useEffect(() => {
    const updatePortal = event => {
      setPortalContainer(event.detail.open
        ? document.querySelector('.specimen-dialog[open] .case-scroll')
        : null);
    };
    window.addEventListener('garden:overlay', updatePortal);
    return () => window.removeEventListener('garden:overlay', updatePortal);
  }, []);

  return <>
    <style>{'@media(min-width:761px){body:has(.portfolio-agentation) .motion-toggle{bottom:80px}}'}</style>
    <Agentation
      appName="Manya — A Polymath’s Garden"
      className="portfolio-agentation"
      portalContainer={portalContainer}
    />
  </>;
}
