import type { ReactNode } from 'react';

export function PageHeader({ kicker, title, lead }: { kicker: string; title: string; lead?: string }) {
  return (
    <header className="mb-8">
      <div className="text-[12px] font-medium tracking-wide text-[#087F8C]">{kicker}</div>
      <h1 className="mt-2 text-3xl md:text-[38px] font-extrabold tracking-tight text-[#10243A]">{title}</h1>
      {lead && <p className="mt-3 text-base text-[#3B5268] leading-relaxed max-w-[75ch]">{lead}</p>}
    </header>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 ${className}`}>
      {title && <h2 className="text-lg font-bold text-[#10243A] mb-3">{title}</h2>}
      {children}
    </section>
  );
}
