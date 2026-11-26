# 07 — تحليل فجوة التقييم السريري (Clinical Evaluation Gap Analysis)

> **الخلاصة:** للاستخدام الافتراضي (B) تلزم أدلة سريرية كاملة. **الموجود اليوم: لا شيء (none).** والاستخدام الحالي (A) لا يحتاج تقييماً سريرياً لأنه ليس جهازاً طبياً (الملف 01). المنتج **غير معتمد**.

## 1) الإطار المرجعي
- **MDS-REQ 1، الملحق (6) Clinical Evaluation and Post-Market Clinical Follow-Up** (S1، ص 81): يطلب من المصنّع خطة تقييم سريري تتضمن، ضمن أمور أخرى، *"a clinical development plan indicating progression from exploratory investigations, such as first-in-man studies, feasibility and pilot studies, to confirmatory investigations, such as pivotal clinical investigations, and a PMCF"*، ومراجعة أدبيات منهجية، وتوليد بيانات جديدة *"through properly designed clinical investigations"*. ويشترط أن يكون التقييم *"thorough and objective, and take into account both favorable and unfavorable data"*، متناسباً مع الفئة والادعاءات.
- **IMDRF N41 (SaMD: Clinical Evaluation)** كما أدرجته SFDA في MDS-G23 (S3): ثلاثة مكونات:
  1. **Valid clinical association (scientific validity):** هل مخرج البرنامج *"clinically accepted or well-founded"* ويطابق الحالة السريرية المستهدفة؟
  2. **Analytical / technical validation:** هل يعالج البرنامج المدخلات *"accurately, reliably and precisely"*؟ و*"Analytical validation is necessary for any SaMD."*
  3. **Clinical validation:** هل يعطي *"clinically meaningful output"* في الفئة والسياق المستهدفين؟
- **MDS-G010** إن استُخدم AI/ML (S4): المتطلبات *"apply to all risk categories"*، ويُفضّل التحقق التحليلي على *"large independent reference dataset"* من عدة مراكز، مع ألا تكون مجموعة بيانات الاختبار *"publicly available"*، ودراسة متعددة المواقع، ومراجعة مستقلة متناسبة مع الخطر.
- **MDS-REQ 2** للدراسات السريرية في المملكة (S7): موافقة SFDA، ولجنة أخلاقيات (EC/IRB) مسجلة في اللجنة الوطنية للأخلاقيات الحيوية (NCBE)، والالتزام بـ ISO 14155 *"or any other similar standard"*، وإعلان هلسنكي، واللائحة التنفيذية لنظام أخلاقيات البحث على المخلوقات الحية.

## 2) جدول الفجوة للاستخدام (B)

| المكوّن | ما يلزم (تقدير الفريق بناءً على المصادر أعلاه) | الموجود اليوم | الفجوة |
|---|---|---|---|
| **Valid clinical association** | دليل منشور أو بحث أصلي على أن المؤشر المحسوب (مثلاً مقاومة مجهرية أو انحراف تدفق) يرتبط فعلاً بـ no-reflow النسيجي ونتائج المرضى | المقترح يستشهد بأدبيات عن الحاجة السريرية [1–3] ويحذّر نفسه من أن *"persistent imaging deficits do not always equal microvascular no-reflow"* (المقترح، القسم 2). **لا يوجد ربط بين مخرجات النموذج الحالي وأي مؤشر سريري** | كاملة |
| **Analytical validation** | دقة وتكرار وإعادة إنتاج على بيانات مرجعية معنونة (مثلاً تصوير تروية) من مراكز متعددة | التحقق الحسابي فقط (الملف 04)، وعلى مدخلات هندسية لا بيانات مرضى. لا توجد بيانات مرضى في النظام (ISLES 2024 «NOT IMPLEMENTED»، STATUS.md) | كاملة |
| **Clinical validation** | دراسة سريرية (استعادية ثم استباقية) بمقاييس محددة مسبقاً: الحساسية، والنوعية، وPPV، وNPV، ونسب الأرجحية (أمثلة MDS-G010)، وأثر على القرار والنتائج | **لا شيء** | كاملة |
| **مراجعة أدبيات منهجية** | بروتوكول بحث، تقييم جودة، بيانات مؤيدة ومعارضة | قائمة مراجع في المقترح (13 مرجعاً) + كتالوج أدلة (21 مصدراً، 3 فقط متصلة فعلياً، PROJECT_AUDIT A6). **ليست مراجعة منهجية** | كبيرة |
| **التكافؤ مع جهاز قائم (equivalence)** | جهاز مماثل بنفس الاستخدام بأدلة متاحة، و*"sufficient clinical and technical equivalence"* (S4) | لم يُبحث؛ الفكرة نفسها بحثية جديدة | غير معروفة؛ مرجّح عدم إمكانها |
| **قابلية الاستخدام كجزء من التقييم** | تقييم *"Human-computer interactions, including how the output is interpreted and actioned"* (S4)، وملف IEC 62366-1 (S11) | لا ملف قابلية استخدام | كاملة |
| **متابعة ما بعد التسويق (PMCF)** | خطة PMCF وفق S1 الملحق 6 الجزء B | لا شيء | كاملة |
| **مراجعة مستقلة** | مراجع *"who has not been significantly involved in the development"* (S4) | لا شيء | كاملة |

## 3) ما الذي **لا يُعدّ** دليلاً سريرياً (لتفادي سوء الاستخدام، H-MIS-1)
- نتائج المحاكاة في هذه المنصة، مهما بلغ عددها أو دقتها العددية.
- نجاح اختبارات الوحدة أو اختبارات المتصفح.
- نتائج على شريحة مختبرية (حتى بعد بنائها): المقترح نفسه يقول *"Even successful on-chip results do not establish clinical efficacy or justify treatment recommendations"* (المقترح، القسم 16).
- سجلات قاعدة الأدلة العامة (ClinicalTrials.gov، openFDA): تخص منتجات أخرى ومصنفة `RESEARCH_ONLY`.
- الفوز في مسابقة أو تقييم لجنة تحكيم.

## 4) تسلسل الأدلة الواقعي المقترح (للاستخدام B، تقدير الفريق)
1. **ما قبل السريري:** التحقق المختبري للمنصة (الملف 05)، ثم نشر علمي محكّم.
2. **فرضية ارتباط سريري:** تحديد مؤشر قابل للقياس عند المريض، بالاشتراك مع طبيب أعصاب تداخلي (المقترح، القسم 15، السؤال 2: *"What evidence would establish that the model represents clinically relevant no-reflow…"*).
3. **دراسة استعادية (retrospective)** على بيانات مرضى مجهولة الهوية من مستشفى شريك، بموافقة أخلاقيات. مسار الدراسات غير التداخلية يحتاج تأكيداً من لجنة الأخلاقيات وSFDA؛ **لم نتحقق من متطلباته الدقيقة**.
4. **تحقق تحليلي متعدد المراكز** على مجموعة بيانات غير منشورة (S4).
5. **دراسة سريرية استباقية** وفق MDS-REQ 2 وISO 14155 (S7)، إذا كان الدليل الاستعادي غير كافٍ (وهو المرجّح للفئة D).
6. **تقرير تقييم سريري** (Clinical Evaluation Report) ومراجعة مستقلة، ثم خطة PMCF.

كل خطوة تعتمد على جهات خارجية (الملف 08).
