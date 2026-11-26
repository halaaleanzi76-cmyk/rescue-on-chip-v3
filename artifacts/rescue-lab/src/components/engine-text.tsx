import { useI18n } from '@/lib/i18n';
import { translateEngineText } from '@/lib/messages/engine';

/** Shows an engine-generated sentence in the active language; the original English stays available as a tooltip. */
export function EngineText({ text }: { text: string }) {
  const { lang } = useI18n();
  const r = translateEngineText(text, lang);
  if (!r.translated) return <span lang={lang === 'ar' ? 'en' : undefined} dir="auto">{text}</span>;
  return <span title={text} data-engine-original={text}>{r.text}</span>;
}

/** Plain-string variant for attributes and joined lists. */
export function useEngineText() {
  const { lang } = useI18n();
  return (text: string) => translateEngineText(text, lang).text;
}
