import { FileText, FileSpreadsheet, FileJson, BookOpen, ExternalLink } from 'lucide-react';
import { usePageTitle } from '@/components/shell';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { PageHeader, Card } from './problem';

const FILES: [MessageKey, string, typeof FileText][] = [
  ['evh.dlReport', '/evidence/SCIENTIFIC_VALIDATION_REPORT.pdf', FileText],
  ['evh.dlCsv', '/evidence/EXPERIMENT_RESULTS.csv', FileSpreadsheet],
  ['evh.dlJson', '/evidence/verification_results.json', FileJson],
  ['evh.dlAssump', '/evidence/MODEL_ASSUMPTIONS.md', BookOpen],
  ['evh.dlRepro', '/evidence/REPRODUCIBILITY.md', BookOpen],
  ['evh.dlRefs', '/evidence/SCIENTIFIC_REFERENCES.md', BookOpen],
  ['evh.dlQa', '/evidence/JUDGE_QA.md', BookOpen],
  ['evh.dlProposal', '/api/source', FileText],
];

/** References: what each one is used for in this platform. */
const REFS: { id: string; cite: string; url: string; role: 'bg' | 'method' }[] = [
  { id: 'PMID 40160088', cite: 'Ng et al. Persistent tissue-level hypoperfusion (no-reflow) negates the clinical benefit of successful thrombectomy. Stroke 2025.', url: 'https://pubmed.ncbi.nlm.nih.gov/40160088/', role: 'bg' },
  { id: 'PMID 39648915', cite: 'Recanalization does not always equate to reperfusion: no-reflow after successful thrombectomy.', url: 'https://pubmed.ncbi.nlm.nih.gov/39648915/', role: 'bg' },
  { id: 'PMID 37871624', cite: 'Persistent hypoperfusion after recanalization: systematic review.', url: 'https://pubmed.ncbi.nlm.nih.gov/37871624/', role: 'bg' },
  { id: 'PMID 41078791', cite: 'Modeling ischemia-reperfusion injury in stroke using the BBB chip. ACS Omega 2025 (full text CC BY, assessed).', url: 'https://pubmed.ncbi.nlm.nih.gov/41078791/', role: 'bg' },
  { id: 'PMID 41808629', cite: 'A BBB-on-a-chip for ischemic stroke modeling with integrated TEER and ion sensors. Anal Chem 2026 (abstract assessed).', url: 'https://pubmed.ncbi.nlm.nih.gov/41808629/', role: 'bg' },
  { id: 'PLOS ONE 2026', cite: 'A human 3D BBB chip model of acute stroke simulating a reversible penumbra.', url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0352263', role: 'bg' },
  { id: 'Hagen–Poiseuille', cite: 'Laminar flow in rigid circular tubes: Q = π r⁴ ΔP / (8 μ L). Textbook relation used for channel and network hydraulics.', url: 'https://en.wikipedia.org/wiki/Hagen%E2%80%93Poiseuille_equation', role: 'method' },
  { id: 'Proposal', cite: 'Neuro-Reflow Rescue 3.0 / Rescue-on-Chip research proposal (22 Nov 2026): architecture, S0–S4, 2×2 design, A/B/C test, ≤5 % goals.', url: '/api/source', role: 'method' },
];

export default function EvidenceHub() {
  const { t } = useI18n();
  usePageTitle(t('nav2.evidence'));
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 space-y-5">
      <PageHeader kicker={t('evh.kicker')} title={t('evh.h1')} />
      <Card title={t('evh.docs')}>
        <div className="grid sm:grid-cols-2 gap-2" data-testid="evidence-downloads">
          {FILES.map(([k, href, Icon]) => (
            <a key={href} href={href} download className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-[#10243A] hover:border-[#087F8C] hover:bg-[#F1F8F9]">
              <Icon className="h-4 w-4 text-[#087F8C] shrink-0" />{t(k)}
            </a>
          ))}
        </div>
      </Card>
      <Card title={t('evh.refs')}>
        <ul className="divide-y" data-testid="evidence-references">
          {REFS.map((r) => (
            <li key={r.id} className="py-3 flex flex-wrap gap-x-4 gap-y-1 items-start">
              <span className="font-num text-xs font-semibold text-[#087F8C] w-36 shrink-0" dir="ltr">{r.id}</span>
              <span className="flex-1 min-w-[240px] text-sm text-[#10243A]" dir="ltr">{r.cite}</span>
              <span className="text-[11px] rounded-full border px-2 py-0.5 text-[#3B5268]">{t(r.role === 'bg' ? 'evh.roleBg' : 'evh.roleMethod')}</span>
              <a href={r.url} target="_blank" rel="noreferrer" className="text-[#087F8C]" aria-label={r.id}><ExternalLink className="h-4 w-4" /></a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
