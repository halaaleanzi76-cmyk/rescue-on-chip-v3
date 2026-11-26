/** A message module: English keys are the source of truth; Arabic must cover every key (checked by TypeScript). */
export function defineMessages<E extends Record<string, string>>(en: E, ar: Record<keyof E, string>) {
  return { en, ar };
}
