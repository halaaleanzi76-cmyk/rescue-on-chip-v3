import { Link } from 'wouter';
import { Compass } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { usePageTitle } from '@/components/shell';

export default function NotFound() {
  const { t } = useI18n();
  usePageTitle(t('notFound.title'));
  return (
    <div className="min-h-[60vh] grid place-items-center px-4">
      <div className="text-center">
        <Compass className="h-10 w-10 mx-auto text-primary mb-4" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-1 font-num text-sm text-muted-foreground">404</p>
        <Link href="/" className="inline-block mt-6 text-primary hover:underline">{t('notFound.back')}</Link>
      </div>
    </div>
  );
}
