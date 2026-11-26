/**
 * NEURO-REFLOW / RESCUE-ON-CHIP identity.
 * Mark: an open circulation loop (continuous perfusion, with direction) wrapping a microvascular
 * branching tree whose terminal capillary nodes are perfused. No brain icon, no medical cross.
 */
import { cn } from '@/lib/utils';

export const BRAND = { navy: '#10243A', teal: '#087F8C', cyan: '#24B6B7', white: '#FFFFFF', bg: '#F8FAFC', border: '#E2EAF0' };

export function LogoMark({ size = 36, inverted = false, className }: { size?: number; inverted?: boolean; className?: string }) {
  const tree = inverted ? BRAND.white : BRAND.navy;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="Neuro-Reflow Rescue-on-Chip">
      {/* circulation loop with flow direction */}
      <path d="M12.4 37.6 A18 18 0 1 1 35.6 37.6" fill="none" stroke={BRAND.teal} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M35.6 37.6 l-1.2 -5.4 l4.9 2.4 z" fill={BRAND.cyan} stroke={BRAND.cyan} strokeWidth="1.2" strokeLinejoin="round" />
      {/* microvascular branching tree */}
      <path d="M24 40 V27.5 M24 27.5 L16.5 20 M24 27.5 L31.5 20 M16.5 20 L12.8 13.6 M16.5 20 L19.6 12.4 M31.5 20 L28.4 12.4 M31.5 20 L35.2 13.6"
        fill="none" stroke={tree} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* perfused capillary terminals */}
      {[[12.8, 13.6], [19.6, 12.4], [28.4, 12.4], [35.2, 13.6]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={BRAND.cyan} />
      ))}
      <circle cx="24" cy="27.5" r="1.6" fill={BRAND.teal} />
    </svg>
  );
}

/** Horizontal lockup: mark + two-line wordmark. `compact` hides the wordmark (header on small screens). */
export function Logo({ inverted = false, compact = false, size = 36, className }: { inverted?: boolean; compact?: boolean; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)} dir="ltr" data-testid="brand-logo">
      <LogoMark size={size} inverted={inverted} />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[9.5px] font-semibold tracking-[0.22em]" style={{ color: inverted ? BRAND.cyan : BRAND.teal }}>NEURO-REFLOW</span>
          <span className="block text-[15px] font-extrabold tracking-[0.02em] mt-[3px]" style={{ color: inverted ? BRAND.white : BRAND.navy }}>RESCUE-ON-CHIP</span>
        </span>
      )}
    </span>
  );
}
