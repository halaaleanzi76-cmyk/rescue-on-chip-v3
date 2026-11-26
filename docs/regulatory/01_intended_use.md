# 01 — الاستخدام المقصود (Intended Use / Intended Purpose)

> المنتج **غير معتمد** وليس جهازاً طبياً. هذا الملف يعرض بيانين: (A) الحالي الصادق، و(B) افتراضي مستقبلي **لم يُنفَّذ ولم يُدَّعَ**. الرموز S1 إلى S11 معرّفة في [README.md](README.md).

## 1) لماذا يهم بيان الاستخدام المقصود؟
تحديد هل البرنامج جهاز طبي، وما فئته، يعتمد على ما يقصده المصنّع منه وليس على تقنيته:
- تعريف IMDRF الذي تبنّته SFDA: SaMD هو *"software intended to be used for one or more medical purposes that perform these purposes without being part of a hardware medical device"* (S3، IMDRF N10 §5.1).
- مخطط القرار في MDS-G027 (Figure 1) يسأل، ضمن خطوات أخرى: *"Is the software's action intended to benefit individual patients?"* فإن كان الجواب «لا» فالنتيجة *"Does not qualify as MD"* (S5، الصفحة 6).
- IMDRF N12: التصنيف *"relies on an accurate and complete SaMD definition statement"*، ويُعاد التقييم إذا تغيّر هذا البيان (S3، N12 §7.1).

---

## 2) البيان (A) — الاستخدام الحالي الفعلي (CURRENT)

### نص البيان
> **Rescue-on-Chip V3** منصة برمجية بحثية للمحاكاة الحسابية (in-silico) لمنصة مختبرية دقيقة مقترحة (microfluidic bench) خارج الجسم (in-vitro)، تساعد فريق البحث على **تخطيط التجارب الهندسية** والتفكير فيها قبل بناء الجهاز. تحسب المنصة: (1) تدفقات Hagen–Poiseuille وعابرات الضغط المفروضة وغسل السائل (washout) لثلاث طرق تبديل (stop-flow، pressure-controlled، equalized)؛ (2) تصميماً افتراضياً 2×2 (سائل × حالة وعاء) بشرائح افتراضية ذات تباين هندسي مفروض؛ (3) نموذج نفاذية حاجز من حجرتين؛ (4) شبكة مقاومات Poiseuille لوحدة وعائية دقيقة **مثالية** (idealized) غير تشريحية.
> **المستخدمون المقصودون:** باحثون ومهندسون وطلاب في بيئة بحثية وتعليمية ومسابقات.
> **المدخلات:** معاملات هندسية يدخلها المستخدم ضمن نطاقات محددة (انظر SRS-001 في الملف 02). **لا تُدخَل أي بيانات مريض.**
> **المخرجات:** أرقام ومنحنيات حسابية مع قائمة افتراضات وتحذيرات وبصمة إعادة إنتاج.
> **ليست للاستخدام:** في التشخيص، أو العلاج، أو الفرز، أو التنبؤ بحالة مريض، أو اختيار دواء، أو أي قرار سريري، أو التوصيل بمريض أو بجهاز طبي.

### الأدلة من الكود على أن البيان (A) يطابق الواقع
| الادعاء | الدليل في المستودع |
|---|---|
| لا توجد نقاط استدلال سريري | `artifacts/api-server/main.py` السطر 1: *"No clinical inference endpoints."*؛ قائمة نقاط النهاية كلها بحثية (انظر الملف 02، القسم 4) |
| النموذج غير معايَر ولا يمثل مرضاً | `simulation/engine.py` السطر 1: *"Auditable, uncalibrated hydraulic + tracer calculations, not a disease model."*؛ `GET /api/model` يعيد `status = "Concept-stage / unvalidated numerical model"` (`main.py`، الدالة `model`) |
| الافتراضات تُرفق بكل نتيجة | `engine.py`: قائمة `assumptions` (11 عبارة)، ومنها *"Not for diagnosis, patient connection or treatment."* |
| الشبكة الوعائية ليست تشريحاً حقيقياً | `vascular/graph.py`: `GEOMETRY_NOTE` و`PHYSICAL_ASSUMPTIONS` (مثلاً *"No clinical efficacy, safety, diagnosis, or treatment conclusion is computed."*) |
| تنبيه «للبحث فقط» ظاهر في الواجهة | `artifacts/rescue-lab/src/lib/i18n.tsx`: المفتاح `banner.ruo` = *"Research use only · Simulated / unvalidated · Concept-stage model · No treatment efficacy is computed or claimed"* |
| نموذج المركّبات (AID1288) لا يعطي تنبؤاً موثوقاً | `research/test_research_ai.py`: `eligible_for_reliable_prediction` = False، و`score_is_calibrated_probability` = False |

### الحكم المرجّح للبيان (A)
بتطبيق مخطط MDS-G027 (S5، Figure 1): البرنامج لا يُقصد به نفع مريض بعينه، ولا يعالج بيانات مريض، ولا يقود جهازاً طبياً. **الأرجح أنه لا ينطبق عليه تعريف الجهاز الطبي.** هذا تقييم الفريق وليس قراراً من SFDA؛ القرار الرسمي لـ SFDA وحدها. يُنصح بطلب رأي SFDA إذا تغيّر أي عنصر في البيان.

### شروط الإبقاء على البيان (A) صحيحاً (ضوابط تنظيمية)
1. عدم إضافة أي إدخال لبيانات مريض (صور، علامات حيوية، نتائج مختبر).
2. عدم صياغة أي مخرج كتوصية لمريض أو كاحتمال سريري.
3. إبقاء تنبيه `banner.ruo` والافتراضات والتحذيرات ظاهرة في كل صفحة وتقرير.
4. في العروض والمسابقات: عدم وصف المنصة بأنها «تشخص» أو «تعالج» أو «تتنبأ بحالة المريض». الادعاءات التسويقية جزء من الاستخدام المقصود.

---

## 3) البيان (B) — استخدام سريري افتراضي مستقبلي (HYPOTHETICAL — غير منفّذ)

> ⚠️ لا يوجد في الكود الحالي أي شيء من هذا. البيان مكتوب فقط لتقدير المسار التنظيمي إن قرر الفريق ذلك مستقبلاً.

### نص البيان الافتراضي
> برنامج دعم قرار سريري (Clinical Decision Support, CDS) يستقبل بيانات مريض بعد استئصال الخثرة الميكانيكي الناجح (successful mechanical thrombectomy) في السكتة الدماغية الإقفارية الحادة، مثل بيانات التروية بالتصوير وقياسات الضغط/اللزوجة، ويقدّر خطر عدم عودة الجريان على المستوى النسيجي (tissue-level no-reflow)، ويعرض للطبيب المختص معلومات تساعده في قرار المتابعة أو التدخل الإضافي.
> **المستخدم:** طبيب أعصاب/أشعة تداخلية مختص. **البيئة:** مستشفى، وحدة سكتة/قسطرة. **الفئة:** بالغون بعد الاستئصال.

### التصنيف المرجّح وفق SFDA (القاعدة 11، الملزمة عبر MDS-REQ 1 الملحق 5)
MDS-G008، القاعدة 11 (S2، الصفحتان 42–43):
- برنامج *"intended to provide information which is used to take decisions with diagnosis or therapeutic purposes is classified as class B"*، إلا إذا كان أثر القرار قد يسبب:
  - *"Death or an irreversible deterioration of a person's state of health, in which case it is in class D"*
  - *"A serious deterioration of a person's state of health or a surgical intervention, in which case it is classified as class C"*
- من أمثلة الفئة D في الوثيقة نفسها: *"Medical Device Software intended to perform diagnosis by means of image analysis for making treatment decisions in patients with acute stroke."*

**التقدير:** القرار المبني على البيان (B) في السكتة الحادة قد يؤدي خطؤه إلى وفاة أو تدهور لا رجعة فيه (توسّع الاحتشاء، أو تدخل غير لازم بنزيفه المحتمل). لذلك **الفئة المرجّحة هي D (الأعلى خطراً)**، وأقل احتمال واقعي هو C إذا قُيّد الاستخدام بشدة (مثلاً معلومات للمتابعة غير العاجلة فقط). ويطلب MDS-G008 تحديد كل القواعد المنطبقة ثم *"classify the device based on the highest risk class"* (S2، مخطط الصفحة 6). التصنيف مسؤولية المصنّع والتأكيد النهائي من SFDA. **لم نقرأ نص اللائحة التنفيذية لنظام الأجهزة الطبية نفسه في هذه الجولة.**

لاحظ: مستوى القاعدة 11 في SFDA لا يخفّض الفئة لمجرد أن المعلومة «تُعلِم» الطبيب فقط، فالعامل الحاسم هو أثر القرار المحتمل.

### المقارنة بفئات IMDRF SaMD (للاسترشاد فقط، S3 N12 §7.2)
| حالة الرعاية | Treat or diagnose | Drive clinical management | Inform clinical management |
|---|---|---|---|
| **Critical** | **IV** | **III** | **II** |
| Serious | III | II | I |
| Non-serious | II | I | I |

- **حالة الرعاية:** السكتة الحادة تطابق تعريف *"Critical situation or condition"*: *"accurate and/or timely diagnosis or treatment action is vital to avoid death, long-term disability..."*، وهي حالة *"time critical"* ومخصصة لـ *"specialized trained users"* (S3، N12 §5.2.1).
- **أهمية المعلومة:**
  - إذا وجّه البرنامج التدخل التالي (aid in diagnosis / triage / guide next treatment) فهو *"Drive clinical management"* (N12 §5.1.2)، والنتيجة **الفئة III**.
  - إذا ادّعى التشخيص المباشر لـ no-reflow فهو *"Treat or diagnose"*، والنتيجة **الفئة IV**.
  - إذا اقتصر على تجميع معلومات لا تحفّز إجراءً فورياً *"will not trigger an immediate or near term action"* (N12 §5.1.3) فهو *"Inform"*، والنتيجة **الفئة II**. هذا صعب الادعاء في سياق حاد وزمني.
- **الأرجح واقعياً:** III، وهي في مستوى *"high impact"* وفق N12 §7.3.

### ماذا يترتب على البيان (B)؟
- إن استُخدم تعلّم آلي في التقدير، تنطبق أيضاً MDS-G010 (S4)، التي تشترط تقييماً سريرياً *"apply to all risk categories"* ومجموعات بيانات مرجعية مستقلة متعددة المراكز وغير منشورة.
- ملف تقني كامل وفق MDS-REQ 1 الملحق 3، وتقييم سريري وفق الملحق 6 (S1)، ونظام جودة (S8)، وأمن سيبراني (S6)، وغالباً دراسة سريرية وفق MDS-REQ 2 (S7). التفاصيل في الملفين 07 و08.
- **الفجوة بين (A) و(B) ليست برمجية فقط:** نموذج الشريحة الحالي لا يستقبل بيانات مريض، ولم يُتحقَّق منه حتى مقابل بيانات مختبرية (الملف 05). الانتقال إلى (B) مشروع جديد عملياً.

## 4) قرار الفريق الموصى به
الإبقاء على البيان (A) خلال المسابقة وما بعدها مباشرة، والتعامل مع (B) كرؤية بحثية طويلة الأمد مشروطة بالمراحل في [08_regulatory_roadmap.md](08_regulatory_roadmap.md).
