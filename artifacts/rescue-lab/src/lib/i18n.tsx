/**
 * Localization: Arabic (default, RTL) and English (LTR).
 * - All UI strings live in `messages` below: never hard-code user-facing text in components.
 * - `useI18n().t('key', {var})` returns the active language's string.
 * - The choice is persisted (localStorage, and the user's profile when signed in) and applied
 *   to <html lang dir> so layout, fonts and number formatting follow.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'ar' | 'en';
const STORAGE_KEY = 'roc.lang';

const en = {
  'app.name': 'Rescue-on-Chip',
  'app.tagline': 'neurovascular perfusion bench · virtual',
  'banner.ruo': 'Research use only · Simulated / unvalidated · Concept-stage model · No treatment efficacy is computed or claimed',
  'footer.source': 'Source proposal prepared 22 Nov 2026 · concept / pre-prototype.',
  'footer.evidence': 'Public evidence is source-specific; virtual chip outputs remain simulated and unvalidated.',
  'nav.lab': '3D Laboratory', 'nav.vascular': 'Vascular twin', 'nav.ai': 'AI research', 'nav.evidence': 'Clinical evidence',
  'nav.analysis': 'Analysis', 'nav.compare': 'Compare', 'nav.runs': 'Run history', 'nav.model': 'Model & methods',
  'nav.admin': 'Admin',
  'summary.runs': 'runs', 'summary.chips': 'virtual chips', 'summary.model': 'model',
  'health.checking': 'checking', 'health.online': 'engine online', 'health.offline': 'engine offline',
  'lang.switch': 'العربية', 'lang.label': 'Language',
  'sim.badge': 'Simulated · unvalidated',

  'auth.signIn': 'Sign in', 'auth.signUp': 'Create account', 'auth.signOut': 'Sign out', 'auth.account': 'My account',
  'auth.email': 'Email', 'auth.password': 'Password', 'auth.passwordConfirm': 'Confirm password', 'auth.newPassword': 'New password',
  'auth.displayName': 'Display name (optional)',
  'auth.forgot': 'Forgot your password?', 'auth.noAccount': 'No account yet?', 'auth.haveAccount': 'Already have an account?',
  'auth.signInTitle': 'Sign in to Rescue-on-Chip', 'auth.signInLead': 'Save experiments, keep a private run history and export reproducible reports.',
  'auth.signUpTitle': 'Create a research account', 'auth.signUpLead': 'We will send a verification link. Your account becomes usable only after you confirm your email.',
  'auth.checkEmailTitle': 'Check your inbox',
  'auth.checkEmail': 'We sent a verification link to {email}. Open it on this device to activate your account. The link expires; you can request another below.',
  'auth.resend': 'Resend verification email', 'auth.resent': 'Verification email sent again.',
  'auth.forgotTitle': 'Reset your password', 'auth.forgotLead': 'Enter your account email. If an account exists, a reset link will be sent.',
  'auth.sendReset': 'Send reset link', 'auth.resetSent': 'If an account exists for {email}, a password reset link is on its way.',
  'auth.resetTitle': 'Choose a new password', 'auth.resetSave': 'Update password', 'auth.resetDone': 'Password updated. You are signed in.',
  'auth.resetNeedsLink': 'Open this page from the reset link in your email.',
  'auth.callbackWorking': 'Confirming your link…', 'auth.callbackFailed': 'This link is invalid or has expired. Request a new one.',
  'auth.verified': 'Email verified. Welcome!',
  'auth.notConfigured': 'Accounts are not configured on this server yet. An administrator must add the Supabase keys to .env.local.',
  'auth.requiredTitle': 'Sign in required', 'auth.requiredBody': 'Sign in with a verified account to use this feature.',
  'auth.forbiddenTitle': 'Not permitted', 'auth.forbiddenBody': 'Your role does not allow this action.',
  'auth.sessionExpired': 'Your session expired. Please sign in again.',
  'auth.signedOut': 'You have been signed out.',
  'auth.working': 'Please wait…',
  'auth.err.passwordShort': 'Use at least 8 characters.', 'auth.err.passwordMismatch': 'Passwords do not match.',
  'auth.err.email': 'Enter a valid email address.', 'auth.err.generic': 'Something went wrong. Please try again.',
  'auth.err.invalidCredentials': 'Email or password is incorrect.', 'auth.err.notConfirmed': 'Please verify your email first. Check your inbox.',
  'auth.err.rateLimit': 'Too many attempts. Wait a minute and try again.',
  'auth.err.cooldown': 'For security, another email can be requested for this address in {seconds} seconds.',
  'auth.err.emailQuota': 'This project has reached its hourly email limit. Try again later; an administrator can raise it in Supabase → Authentication → Rate Limits.',
  'auth.err.samePassword': 'The new password must be different from your current password.',
  'auth.err.weakPassword': 'This password is too weak. Use a longer mix of letters, numbers and symbols.',

  'account.title': 'My account', 'account.role': 'Role', 'account.status': 'Status', 'account.verified': 'Email verified',
  'account.memberSince': 'Member since', 'account.language': 'Interface language', 'account.save': 'Save changes', 'account.saved': 'Profile saved.',
  'account.changePassword': 'Change password', 'account.sessionNote': 'Sessions expire automatically; signing out ends this device’s session.',

  'role.admin': 'Administrator', 'role.researcher': 'Researcher', 'role.reviewer': 'Reviewer', 'role.viewer': 'Viewer',
  'status.active': 'Active', 'status.suspended': 'Suspended',

  'admin.title': 'Administration', 'admin.users': 'Users', 'admin.audit': 'Security audit log', 'admin.search': 'Filter by email',
  'admin.colEmail': 'Email', 'admin.colRole': 'Role', 'admin.colStatus': 'Status', 'admin.colVerified': 'Verified', 'admin.colLastSeen': 'Last seen',
  'admin.colAction': 'Action', 'admin.colActor': 'By', 'admin.colTarget': 'Target', 'admin.colTime': 'Time',
  'admin.updated': 'User updated.', 'admin.lastAdmin': 'The last active administrator cannot be demoted or suspended.',
  'admin.you': 'you', 'admin.empty': 'No users yet.', 'admin.suspend': 'Suspend', 'admin.activate': 'Activate',

  'common.loading': 'Loading…', 'common.retry': 'Retry', 'common.yes': 'Yes', 'common.no': 'No', 'common.error': 'Error',
  'err.network': 'The server could not be reached. Check that the platform is running.',
  'err.server': 'The server could not complete this request.',
  'save.signInToSave': 'Sign in with a verified researcher account to save experiments. Previews keep working without an account.',
  'notFound.title': 'Page not found', 'notFound.back': 'Back to the laboratory',
} as const;

type CoreKey = keyof typeof en;

const ar: Record<CoreKey, string> = {
  'app.name': 'Rescue-on-Chip',
  'app.tagline': 'منصة تروية وعائية عصبية · افتراضية',
  'banner.ruo': 'للاستخدام البحثي فقط · نتائج محاكاة غير مُتحقَّق منها · نموذج في مرحلة المفهوم · لا تُحسب ولا تُدّعى أي فعالية علاجية',
  'footer.source': 'المقترح المصدر أُعدّ في 22 نوفمبر 2026 · مرحلة المفهوم / ما قبل النموذج الأولي.',
  'footer.evidence': 'الأدلة العامة خاصة بمصدرها؛ ومخرجات الرقائق الافتراضية تبقى محاكاةً غير مُتحقَّق منها.',
  'nav.lab': 'المختبر ثلاثي الأبعاد', 'nav.vascular': 'التوأم الوعائي', 'nav.ai': 'أبحاث الذكاء الاصطناعي', 'nav.evidence': 'الأدلة السريرية',
  'nav.analysis': 'التحليل', 'nav.compare': 'المقارنة', 'nav.runs': 'سجل التجارب', 'nav.model': 'النموذج والمنهجية',
  'nav.admin': 'الإدارة',
  'summary.runs': 'تجارب', 'summary.chips': 'رقائق افتراضية', 'summary.model': 'النموذج',
  'health.checking': 'جارٍ الفحص', 'health.online': 'المحرك يعمل', 'health.offline': 'المحرك متوقف',
  'lang.switch': 'English', 'lang.label': 'اللغة',
  'sim.badge': 'محاكاة · غير مُتحقَّق منها',

  'auth.signIn': 'تسجيل الدخول', 'auth.signUp': 'إنشاء حساب', 'auth.signOut': 'تسجيل الخروج', 'auth.account': 'حسابي',
  'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور', 'auth.passwordConfirm': 'تأكيد كلمة المرور', 'auth.newPassword': 'كلمة المرور الجديدة',
  'auth.displayName': 'الاسم الظاهر (اختياري)',
  'auth.forgot': 'نسيت كلمة المرور؟', 'auth.noAccount': 'ليس لديك حساب؟', 'auth.haveAccount': 'لديك حساب بالفعل؟',
  'auth.signInTitle': 'تسجيل الدخول إلى Rescue-on-Chip', 'auth.signInLead': 'احفظ تجاربك، واحتفظ بسجل خاص بك، وصدّر تقارير قابلة لإعادة الإنتاج.',
  'auth.signUpTitle': 'إنشاء حساب بحثي', 'auth.signUpLead': 'سنرسل لك رابط تحقق، ولن يعمل حسابك إلا بعد تأكيد بريدك الإلكتروني.',
  'auth.checkEmailTitle': 'تحقّق من بريدك',
  'auth.checkEmail': 'أرسلنا رابط التحقق إلى {email}. افتحه على هذا الجهاز لتفعيل حسابك. للرابط مدة صلاحية، ويمكنك طلب رابط جديد من الأسفل.',
  'auth.resend': 'إعادة إرسال رسالة التحقق', 'auth.resent': 'أُعيد إرسال رسالة التحقق.',
  'auth.forgotTitle': 'إعادة تعيين كلمة المرور', 'auth.forgotLead': 'أدخل بريد حسابك، وإن كان الحساب موجودًا فسيصلك رابط إعادة التعيين.',
  'auth.sendReset': 'إرسال رابط إعادة التعيين', 'auth.resetSent': 'إن كان هناك حساب مسجّل بالبريد {email}، فرابط إعادة التعيين في الطريق إليك.',
  'auth.resetTitle': 'اختر كلمة مرور جديدة', 'auth.resetSave': 'تحديث كلمة المرور', 'auth.resetDone': 'تم تحديث كلمة المرور، وأنت الآن مسجّل الدخول.',
  'auth.resetNeedsLink': 'افتح هذه الصفحة من رابط إعادة التعيين الموجود في بريدك.',
  'auth.callbackWorking': 'جارٍ تأكيد الرابط…', 'auth.callbackFailed': 'هذا الرابط غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.',
  'auth.verified': 'تم التحقق من بريدك. أهلًا بك!',
  'auth.notConfigured': 'الحسابات غير مفعّلة على هذا الخادم بعد. يجب على المسؤول إضافة مفاتيح Supabase إلى الملف ⁦.env.local⁩.',
  'auth.requiredTitle': 'يلزم تسجيل الدخول', 'auth.requiredBody': 'سجّل الدخول بحساب مُتحقَّق منه لاستخدام هذه الميزة.',
  'auth.forbiddenTitle': 'غير مسموح', 'auth.forbiddenBody': 'دورك لا يسمح بهذا الإجراء.',
  'auth.sessionExpired': 'انتهت جلستك، فسجّل الدخول مرة أخرى.',
  'auth.signedOut': 'تم تسجيل خروجك.',
  'auth.working': 'يُرجى الانتظار…',
  'auth.err.passwordShort': 'استخدم 8 أحرف على الأقل.', 'auth.err.passwordMismatch': 'كلمتا المرور غير متطابقتين.',
  'auth.err.email': 'أدخل بريدًا إلكترونيًا صحيحًا.', 'auth.err.generic': 'حدث خطأ، فحاول مرة أخرى.',
  'auth.err.invalidCredentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'auth.err.notConfirmed': 'أكّد بريدك الإلكتروني أولًا، وتحقّق من صندوق الوارد.',
  'auth.err.rateLimit': 'محاولات كثيرة جدًا. انتظر دقيقة ثم حاول مجددًا.',
  'auth.err.cooldown': 'لأسباب أمنية، تقدر تطلب رسالة جديدة لهذا البريد بعد {seconds} ثانية.',
  'auth.err.emailQuota': 'المشروع وصل الحد الأقصى للرسائل في الساعة. حاول لاحقًا، أو يرفع المسؤول الحد من Supabase ← Authentication ← Rate Limits.',
  'auth.err.samePassword': 'لازم تكون كلمة المرور الجديدة مختلفة عن الحالية.',
  'auth.err.weakPassword': 'كلمة المرور ضعيفة. استخدم كلمة أطول فيها حروف وأرقام ورموز.',

  'account.title': 'حسابي', 'account.role': 'الدور', 'account.status': 'الحالة', 'account.verified': 'تم التحقق من البريد',
  'account.memberSince': 'عضو منذ', 'account.language': 'لغة الواجهة', 'account.save': 'حفظ التغييرات', 'account.saved': 'تم حفظ الملف الشخصي.',
  'account.changePassword': 'تغيير كلمة المرور', 'account.sessionNote': 'تنتهي الجلسات تلقائيًا، وتسجيل الخروج يُنهي جلسة هذا الجهاز.',

  'role.admin': 'مسؤول', 'role.researcher': 'باحث', 'role.reviewer': 'مُراجِع', 'role.viewer': 'مُشاهِد',
  'status.active': 'نشط', 'status.suspended': 'موقوف',

  'admin.title': 'الإدارة', 'admin.users': 'المستخدمون', 'admin.audit': 'سجل التدقيق الأمني', 'admin.search': 'تصفية حسب البريد',
  'admin.colEmail': 'البريد', 'admin.colRole': 'الدور', 'admin.colStatus': 'الحالة', 'admin.colVerified': 'مُتحقَّق', 'admin.colLastSeen': 'آخر ظهور',
  'admin.colAction': 'الإجراء', 'admin.colActor': 'بواسطة', 'admin.colTarget': 'الهدف', 'admin.colTime': 'الوقت',
  'admin.updated': 'تم تحديث المستخدم.', 'admin.lastAdmin': 'لا يمكن خفض دور آخر مسؤول نشط أو إيقافه.',
  'admin.you': 'أنت', 'admin.empty': 'لا يوجد مستخدمون بعد.', 'admin.suspend': 'إيقاف', 'admin.activate': 'تفعيل',

  'common.loading': 'جارٍ التحميل…', 'common.retry': 'إعادة المحاولة', 'common.yes': 'نعم', 'common.no': 'لا', 'common.error': 'خطأ',
  'err.network': 'تعذّر الوصول إلى الخادم. تأكد من أن المنصة قيد التشغيل.',
  'err.server': 'تعذّر على الخادم إكمال هذا الطلب.',
  'save.signInToSave': 'سجّل الدخول بحساب باحث مُتحقَّق منه لحفظ التجارب. المعاينات تعمل دون حساب.',
  'notFound.title': 'الصفحة غير موجودة', 'notFound.back': 'العودة إلى المختبر',
};

// Page-level dictionaries (one module per area). Add new modules to MODULES.
import { lab } from './messages/lab';
import { fields } from './messages/fields';
import { pages } from './messages/pages';
import { analysis } from './messages/analysis';
import { vascular } from './messages/vascular';
import { research } from './messages/research';
import { evidence } from './messages/evidence';
import { guide } from './messages/guide';
const MODULES = [lab, fields, pages, analysis, vascular, research, evidence, guide] as const;
type ModuleKeys = keyof (typeof lab)['en'] | keyof (typeof fields)['en'] | keyof (typeof pages)['en'] | keyof (typeof analysis)['en'] | keyof (typeof vascular)['en'] | keyof (typeof research)['en'] | keyof (typeof evidence)['en'] | keyof (typeof guide)['en'];
export type MessageKey = CoreKey | ModuleKeys;

export const messages: Record<Lang, Record<string, string>> = {
  en: Object.assign({}, en, ...MODULES.map((m) => m.en)),
  ar: Object.assign({}, ar, ...MODULES.map((m) => m.ar)),
};

function interpolate(s: string, vars?: Record<string, string | number>) {
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Active language for code outside React components (validation, error mapping). Kept in sync by I18nProvider. */
let currentLang: Lang = 'ar';
export function tr(key: MessageKey, vars?: Record<string, string | number>): string {
  return interpolate(messages[currentLang][key] ?? messages.en[key] ?? key, vars);
}
/** Dynamic keys (e.g. per-field labels). Falls back to English, then to `fallback`. */
export function trd(key: string, fallback = key, vars?: Record<string, string | number>): string {
  return interpolate(messages[currentLang][key] ?? messages.en[key] ?? fallback, vars);
}
export function getLang(): Lang { return currentLang; }

function initialLang(): Lang {
  if (typeof window === 'undefined') return 'ar';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'ar' ? saved : 'ar';
}

type Ctx = {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  setLang: (l: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  fmtNum: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtDate: (d: string | Date) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function applyDocumentLang(lang: Lang) {
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  currentLang = lang; // synchronous, so children rendered in this pass already see the new language
  useEffect(() => { applyDocumentLang(lang); }, [lang]);
  const setLang = useCallback((l: Lang) => {
    window.localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);
  const value = useMemo<Ctx>(() => {
    // Latin digits in both languages keep scientific values unambiguous and copy-pasteable.
    const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB';
    const nf = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    return {
      lang, dir: lang === 'ar' ? 'rtl' : 'ltr', setLang,
      t: (key, vars) => interpolate(messages[lang][key] ?? messages.en[key] ?? key, vars),
      fmtNum: (n, opts) => new Intl.NumberFormat(locale, opts).format(n),
      fmtDate: (d) => nf.format(typeof d === 'string' ? new Date(d) : d),
    };
  }, [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
