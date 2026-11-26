# Rescue-on-Chip Virtual Lab 🧠💧
منصة محاكاة افتراضية لمقترح **Neuro-Reflow Rescue 3.0 — Rescue-on-Chip**.
تجهز فيها التجربة وتشغلها افتراضياً وتحللها قبل ما تبني أي جهاز حقيقي.

> ⚠️ محاكاة بحثية وتعليمية فقط. ليست جهازاً طبياً ولا توصية علاجية.

## وش الموجود في المجلد
| الملف | وش فيه |
|---|---|
| `lib/sim/engine.ts` | **محرك المحاكاة جاهز ومختبر**: فيزياء التدفق (Poiseuille)، المانيفولد A/B/C، حالات S0 إلى S4، فقاعات وارتداد تدفق، البقايا (carryover)، نفاذية الحاجز الدموي الدماغي BBB، الحيوية، تحليل 2×2 مع فترات ثقة، الحكم الثنائي (تدفق + حاجز) |
| `lib/sim/engine.check.ts` | اختبار يتحقق إن المحرك يعطي النتائج المتوقعة |
| `prisma/schema.prisma` | **قاعدة البيانات كاملة**: 20 جدول (مستخدمين، مشاريع، تجارب، أذرع، رقائق، دفعات تصنيع، تشغيلات، بيانات زمنية، أحداث سلامة، نتائج، تحليلات، تسجيل مسبق مقفل، سجل تدقيق) |
| `prisma/seed.ts` | بيانات تجريبية جاهزة: 72 رقاقة، تجربة 2×2 كاملة (48 تشغيل)، وتجربة مقارنة A/B/C (30 تشغيل) |
| `.cursor/rules/project.mdc` | قواعد يقرأها Cursor تلقائياً: التقنيات، الهيكل، الممنوعات |
| `docs/PLATFORM_SPEC.md` | مواصفات المنصة: 9 صفحات والمميزات والأفكار |
| `docs/SIMULATION_MODEL.md` | شرح المعادلات والإحصاء |
| `docs/CURSOR_PROMPTS.md` | **10 برومبتات تلصقها في Cursor بالترتيب** وتطلع لك المنصة |
| `.env.example` | المتغيرات المطلوبة |

## أبرز المميزات
1. **مختبر حي (Digital Twin)**: رسم متحرك للجهاز، الجزيئات تمشي في الأنابيب، القنوات المسدودة تصير حمراء، والفقاعات تبان.
2. **وضع الفوضى (Chaos Mode)**: تحقن فقاعة أو تسريب أو قفزة ضغط، وتشوف أنظمة الحماية كيف توقف التجربة.
3. **حلبة A ضد B ضد C**: تجربة الإبطال من القسم 9 في المقترح، سباق مباشر بين التصاميم الثلاثة.
4. **معالج تجارب 2×2**: توزيع عشوائي على الرقائق، تعمية (blinding)، وتسجيل مسبق مقفل ببصمة SHA-256.
5. **تحليل جاهز للنشر**: تأثيرات F و V و F×V مع فترات ثقة، ومخطط الحكم الثنائي يكشف "الفعالية الكاذبة".
6. **Monte-Carlo وحساسية وتقدير قوة إحصائية** (كم رقاقة تحتاج لكل ذراع).
7. **صفحة الجاهزية**: براءات الاختراع السابقة، الميزانية بالريال، المراحل، وأسئلة الطبيب المشرف.
8. **واجهة عربية RTL وإنجليزية**، وثيم ليلي وثيم نهاري.
9. **تقرير PDF تلقائي** و**مساعد ذكي** يشرح النتائج (اختياري).

## التشغيل
1. ثبّت [Node.js 22+](https://nodejs.org) و [Cursor](https://cursor.com).
2. سوّ مشروع مجاني على [Supabase](https://supabase.com)، وانسخ روابط قاعدة البيانات إلى `.env` (اعتمد على `.env.example`).
3. افتح المجلد في Cursor، وطبّق `docs/CURSOR_PROMPTS.md` خطوة بخطوة.
4. للتأكد إن المحرك شغال:
   ```
   node lib/sim/engine.check.ts
   ```

## Skills مقترحة لـ Cursor / Claude Code
هذي تزيد جودة الكود اللي يكتبه الوكيل (كلها من مصادر رسمية ومشهورة):
```
npx skills add anthropics/skills@frontend-design -g -y
npx skills add supabase/agent-skills@supabase-postgres-best-practices -g -y
npx skills add supabase/agent-skills@supabase -g -y
npx skills add prisma/skills@prisma-database-setup -g -y
npx skills add prisma/skills@prisma-client-api -g -y
npx skills add wshobson/agents@nextjs-app-router-patterns -g -y
npx skills add anthropics/knowledge-work-plugins@data-visualization -g -y
```
