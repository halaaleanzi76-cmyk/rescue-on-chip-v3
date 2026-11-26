# 02 — مواصفات متطلبات البرنامج (Software Requirements Specification, SRS)

> **النطاق:** يصف هذا الملف **ما يفعله الكود فعلاً** بتاريخ 2026-11-26 (`bench-1.0.2`، `vascular-poiseuille-network-0.1.0`)، وليس ما نتمنى أن يفعله. كل متطلب يشير إلى مصدره في المستودع. المسارات نسبية إلى `artifacts/api-server/` ما لم يُذكر غير ذلك.
> المنتج **غير معتمد** وللبحث فقط (انظر [01_intended_use.md](01_intended_use.md)، البيان A).
> هذا SRS مستخرج بالهندسة العكسية من الكود (reverse-engineered)، وليس ناتجاً عن عملية تطوير موثقة وفق IEC 62304 (S10). هذه فجوة مذكورة في الملف 08.

الأولوية: **M** = إلزامي للاستخدام البحثي الحالي، **S** = مرغوب.

## 1) محرك محاكاة التبديل والغسل (Switching / washout / 2×2 engine)
المصدر: `simulation/config.py` (الصنف `ExperimentInput`) و`simulation/engine.py` (الدالة `simulate`).

### SRS-001 — التحقق من المدخلات ونطاقاتها (M)
يجب رفض أي إدخال خارج النطاقات التالية، أو أي حقل غير معروف (`extra="forbid"`)، أو قيمة NaN/Inf (`allow_inf_nan=False`). تُفرض القيم الافتراضية بصيغتها القانونية (`validate_default=True`).

| الحقل | الوحدة | الافتراضي | المدى المسموح |
|---|---|---|---|
| `name` | نص | "Pressure-equilibrated crossover" | 1–100 حرف، ولا يكون فراغاً |
| `seed` | عدد صحيح | 42 | 0 – 2147483647 |
| `replicates` | شرائح/ذراع | 6 | 3 – 100 |
| `pressure_pa` | Pa | 1000 | 10 – 10000 |
| `radius_um` | µm | 25 | 5 – 100 |
| `length_mm` | mm | 10 | 1 – 100 |
| `channels` | قنوات | 16 | 1 – 200 |
| `viscosity_mpas` | mPa·s | 1.2 | 0.5 – 10 |
| `altered_viscosity_ratio` | نسبة | 1.8 | 1 – 5 |
| `narrowing_pct` | % | 20 | 0 – 70 |
| `occlusion_pct` | % | 15 | 0 – 90 |
| `radius_cv_pct` | % | 3 | 0 – 15 |
| `duration_s` | s | 60 | 20 – 600 |
| `switch_s` | s | 10 | 1 – 300 |
| `offset_pct` | % | 25 | −150 – 150 |
| `regulated_tau_s` | s | 2 | 0.1 – 10 |
| `equalized_tau_s` | s | 2 | 0.1 – 10 |
| `regulated_wait_s` | s | 0 | 0 – 60 |
| `equalization_s` | s | 5 | 0 – 60 |
| `stop_duration_s` | s | 1.5 | 0.1 – 10 |
| `dead_volume_ul` | µL | 0.1 | 0.01 – 10 |
| `permeability_um_s` | µm/s | 0.01 | 0.0001 – 1 |
| `injury_permeability_ratio` | نسبة | 3 | 1 – 20 |
| `receiver_volume_ul` | µL | 1 | 0.1 – 100 |
| `rescue_fraction` | 0–1 | 0 | 0 – 1 |
| `barrier_margin_pct` | % | 10 | 0 – 100 |

### SRS-002 — قيد النافذة الزمنية (M)
يُرفض الإدخال إذا كان `switch_s + stop_duration_s + 5 >= duration_s` (`config.py`، `time_window`).

### SRS-003 — جريان Hagen–Poiseuille والتحويل إلى SI (M)
`Q [µL/min] = ΔP · π r⁴ · N / (8 μ L) × 6×10¹⁰`، مع r = radius_um×10⁻⁶ m، وL = length_mm×10⁻³ m، وμ = viscosity_mpas×10⁻³ Pa·s (`engine.py`، `flow_ul_min`).

### SRS-004 — ثلاث طرق تبديل بعابرات مفروضة (M)
لكل من `stop_flow` و`pressure_controlled` و`equalized`: انحراف متبقٍ `residual = offset_pct/100 · exp(−wait/τ)` يتلاشى أسياً بعد التبديل. في `stop_flow` يكون الضغط صفراً لمدة `stop_duration_s`. **هذه عابرات RC يفرضها المستخدم، وليست هندسة مشعب محلولة ولا أداء متحكم مقيساً** (نص الافتراض 3 في `engine.py`).

### SRS-005 — الغسل (washout) (M)
حل معادلة لوغاريتم التركيز لحجم ميت ممزوج تماماً، `dC_old/dt = −Q₊ C_old / V_dead`، باستخدام `scipy.integrate.solve_ivp` (rtol=1e-7، atol=1e-10، max_step=0.1)، مع خلط خطي للزوجة. **يجب** رفع خطأ إذا لم يتقارب الحل (`RuntimeError("Tracer solver did not converge…")`).

### SRS-006 — مقاييس كل طريقة تبديل (M)
`peak_deviation_pct`، و`pressure_target_met` (≤ 5%)، و`carryover_pct` عند نهاية التشغيل، و`carryover_target_met` (≤ 5%)، و`washout_s`، و`flush_volume_ul`، و`interruption_s`، و`reversal_detected`. يجب ألا تُفترض أفضلية أي طريقة مسبقاً.

### SRS-007 — التصميم الافتراضي 2×2 (M)
أربع أذرع `F{0,1}V{0,1}`. نصف قطر كل شريحة يُسحب من توزيع لوغاريتمي طبيعي محفوظ المتوسط بمولّد `numpy.random.default_rng(seed)`. الوعاء «المصاب» = تضيّق نصف القطر بنسبة `narrowing_pct` + فقد قنوات بنسبة `occlusion_pct`. لكل ذراع: المتوسط وفاصل ثقة 95% بتوزيع Student-t، والجريان المعياري، وجريان «الإنقاذ» كعكس هندسي مفروض بنسبة `rescue_fraction`. **ليس قانون استجابة دوائية** (تعليق في الكود).

### SRS-008 — التباينات العاملية (M)
الأثر الرئيسي للسائل، والأثر الرئيسي للوعاء، والتفاعل (difference-in-differences) من متوسطات الأذرع.

### SRS-009 — نموذج نفاذية الحاجز (M)
حجرتان ممزوجتان تماماً بإمداد مانح مستمر، حالتا `healthy` و`injured`، حل LSODA على 121 نقطة زمنية. يجب رفع خطأ عند فشل الحل.

### SRS-010 — كميات مشتقة (M)
عدد رينولدز، وإجهاد القص الجداري `ΔP·r/(2L)`، والمقاومة الهيدروليكية `8μL/(π r⁴ N)`.

### SRS-011 — الافتراضات والتحذيرات (M)
كل نتيجة **يجب** أن تحمل قائمة `assumptions` (11 عبارة)، وتحذيرات شرطية عند: اكتشاف جريان عكسي، أو Re ≥ 1، أو `rescue_fraction > 0`، أو `radius_cv_pct = 0`، أو عدم بلوغ هدف carryover.

### SRS-012 — إعادة الإنتاج والبصمة (M)
`fingerprint = SHA-256(MODEL_VERSION + JSON(config, sort_keys, separators=(",",":")))`. المدخلات نفسها تعطي النتيجة نفسها بالضبط. البصمة قابلة لإعادة الحساب من الإعدادات المصدَّرة. تُسجَّل نسخ numpy وscipy وpandas في `software`.

### SRS-013 — رقم نسخة النموذج (M)
`MODEL_VERSION = "bench-1.0.2"` يُرفق بكل نتيجة ويدخل في البصمة.

## 2) الاشتقاق البصري (3D visualization data)
المصدر: `simulation/visualization.py` (`derive_visualization`).

### SRS-014 — حقول العرض المشتقة (M)
لكل نقطة زمنية: متوسط السرعة `Q/(N π r²)`، وملف ضغط محوري خطي من ضغط المدخل إلى 0 على 25 نقطة، وملف سرعة شعاعي قطع مكافئ `u = 2ū(1−ρ²)` على 17 نقطة (شرط عدم الانزلاق عند الجدار)، وإجهاد القص، والإزاحة كتكامل شبه منحرف للسرعة الموقّعة. الاشتقاق حتمي ولا يعدّل سجل التشغيل الأصلي.

## 3) الحلّال الوعائي (Vascular Poiseuille network)
المصدر: `vascular/contracts.py` و`vascular/graph.py` و`vascular/solver.py`.

### SRS-020 — مدخلات الحلّال (M)
`VascularSolveInput` (`extra="forbid"`، بلا NaN/Inf):
| الحقل | الوحدة | الافتراضي | المدى |
|---|---|---|---|
| `boundary_mode` | — | `fixed_pressure` | `fixed_pressure` أو `fixed_inlet_flow` |
| `inlet_pressure_pa` | Pa | 1000 | 0 – 100000 |
| `outlet_pressure_pa` | Pa | 0 | 0 – 100000 |
| `inlet_flow_ul_min` | µL/min | 1 | > 0 و ≤ 1000000 |
| `viscosity_pa_s` | Pa·s | 0.0012 | > 0 و ≤ 0.1 |
| `radius_overrides_um` | µm لكل مقطع | {} | ≤ 100 مدخل، قيمة موجبة ومنتهية |
| `occluded_segment_ids` | — | [] | ≤ 100، بلا تكرار |

### SRS-021 — الشبكة الافتراضية المثالية (M)
`NETWORK_VERSION = "cerebral-microvascular-idealized-0.1"`. يجب أن تتضمن الاستجابة `geometry_note` الذي يصرّح بأن الإحداثيات وأنصاف الأقطار *"illustrative numerical inputs, not measured human anatomy"*.

### SRS-022 — الحل العددي (M)
موصلية كل مقطع `G = π r⁴ / (8 μ L)`، والمقطع المسدود موصليته صفر. تُحل معادلات حفظ الكتلة عند العقد كنظام خطي متناثر (`scipy.sparse.linalg.spsolve`) بشروط حدية ضغط ثابت أو تدفق مدخل ثابت.

### SRS-023 — رفض الحالات غير المعرّفة (M)
يجب رفع `ValueError` (يتحول إلى HTTP 422 في `main.py`) عند: معرّف مقطع مجهول، أو تكرار في الانسداد، أو نصف قطر غير موجب أو غير منتهٍ، أو مكوّن معزول بلا شرط ضغط، أو انفصال الشبكة في وضع التدفق الثابت، أو مصفوفة شاذة (`MatrixRankWarning`)، أو ضغط غير منتهٍ، أو بقايا كتلة غير منتهية.

### SRS-024 — مخرجات كل مقطع (M)
المقاومة (أو `null` للمسدود)، والضغطان بوحدتي Pa وmmHg (1 mmHg = 133.322387415 Pa)، والتدفق بوحدتي m³/s وµL/min، والاتجاه (`forward`/`reverse`/`stagnant`)، والسرعة بوحدتي m/s وmm/s، وإجهاد القص `4μ|Q|/(π r³)`، وعلَم `occluded`.

### SRS-025 — بقايا حفظ الكتلة (M)
يجب الإبلاغ عن `max_normalized_mass_balance_residual` (أقصى اختلال عند العقد الداخلية مقسوماً على أكبر تدفق).

### SRS-026 — البصمة والنسخة والافتراضات (M)
`input_fingerprint = SHA-256(model_version + network + request)`؛ `MODEL_VERSION = "vascular-poiseuille-network-0.1.0"`؛ قائمة افتراضات تتضمن *"not CFD, a blood-cell transport model, or a calibrated physiological prediction"*.

## 4) واجهة البرمجة (API) والتزامن والتقارير
المصدر: `main.py`.

### SRS-030 — نقاط النهاية (M)
`GET /api/healthz` · `GET /api/model` · `GET /api/summary` · `GET|POST /api/runs` · `GET /api/runs/{id}` · `GET /api/runs/{id}/visualization` · `GET /api/runs/{id}/report?format=html|csv|json` · `POST /api/preview` · `GET /api/source` · `GET /api/ai/overview|training|models` · `POST /api/ai/train` · `GET /api/ai/models/{v}/report` · `GET /api/ai/compound/search` · `POST /api/ai/compound/describe|conformer` · `POST /api/ai/predict` · `GET /api/evidence/overview|search|report|import-log` · `GET /api/vascular/network` · `POST /api/vascular/solve`، إضافة إلى نقاط الحساب في `auth/routes.py` (القسم 5).

### SRS-031 — أخطاء التحقق والأخطاء الداخلية (M)
خطأ التحقق → HTTP 422 بقائمة `{field, message}`. أي استثناء غير معالج → HTTP 500 برسالة عامة دون كشف تفاصيل داخلية، مع تسجيله في السجل.

### SRS-032 — حد التزامن (M)
بحد أقصى حسابان متزامنان (`threading.BoundedSemaphore(2)`) لكل من `POST /api/runs` و`/api/preview` و`/api/vascular/solve`. الطلب الزائد → HTTP 429.

### SRS-033 — حفظ التشغيل كسجل علمي (M)
يُتحقَّق من كامل المخرج مقابل عقد `SimulationRun` قبل إعادته. يُحفظ في جدول PostgreSQL `simulation_runs` (المعرّف UUID، والبصمة، والإعدادات، والنتيجة JSONB، والمالك) (`simulation/store.py`، `save`).

### SRS-034 — التقارير والتصدير مع الأصل (provenance) (M)
HTML (تُهرَّب النصوص بـ `html.escape`)، وCSV يكرر `run_id` و`input_fingerprint` و`model_version` في كل صف، وJSON. الترويسات: `Content-Disposition: attachment` و`X-Content-Type-Options: nosniff`.

### SRS-035 — إعلان حالة النموذج (M)
`GET /api/model` يعيد `status: "Concept-stage / unvalidated numerical model"` مع المعادلات والافتراضات.

## 5) الهوية والصلاحيات (Auth & roles)
المصدر: `auth/core.py` و`auth/routes.py` و`db/migrations/002_auth_profiles_audit.sql` (في جذر المستودع).

### SRS-040 — التحقق من الرمز عند Supabase (M)
كل رمز Bearer يُتحقَّق منه بطلب `GET {SUPABASE_URL}/auth/v1/user`. النتيجة تُخزَّن مؤقتاً 60 ثانية بمفتاح SHA-256 للرمز. رفض Supabase → 401. تعذّر الوصول أو رد غير متوقع → 503.

### SRS-041 — البريد غير المؤكد والحساب الموقوف (M)
بريد غير مؤكد → 403. حساب `status='suspended'` → 403.

### SRS-042 — الأدوار من قاعدة البيانات فقط (M)
الأدوار `admin` و`researcher` و`reviewer` و`viewer` (قيد CHECK)، والافتراضي `researcher`. لا يُقبل الدور من العميل: `PATCH /api/me` يقبل فقط `display_name` (≤ 80 حرفاً) و`locale` (`ar`/`en`).

### SRS-043 — مصفوفة الصلاحيات (M)
| العملية | مجهول | viewer/reviewer | researcher | admin |
|---|---|---|---|---|
| حسابات عامة (preview، vascular solve، model، ai describe/predict، evidence) | ✓ | ✓ | ✓ | ✓ |
| `POST /api/runs` (حفظ تشغيل) | ✗ 401 | ✗ 403 | ✓ | ✓ |
| `POST /api/ai/train` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ |
| `/api/admin/*` | ✗ 401 | ✗ 403 | ✗ 403 | ✓ |

### SRS-044 — عزل البيانات (M)
المجهول يرى التشغيلات العامة فقط (`owner_id IS NULL`). المستخدم يرى العامة وتشغيلاته. المدير يرى الكل. التشغيل غير المرئي وغير الموجود يعيدان كلاهما **404** بلا تمييز (`main.py`، `require_run`؛ `store.py`، `_scope`).

### SRS-045 — تسجيل المدير الأول (M)
يُرقّى الحساب إلى `admin` فقط إذا طابق البريد المؤكد `INITIAL_ADMIN_EMAIL` ولم يوجد مدير. العملية مسلسلة بقفل جدول. فهرس فريد على `lower(email)` يمنع ربط البريد بهوية ثانية (→ 409).

### SRS-046 — حماية آخر مدير (M)
لا يمكن تخفيض أو إيقاف آخر مدير نشط (→ 409).

### SRS-047 — سجل التدقيق (M)
تُسجَّل الأحداث: `auth.profile_created`، و`auth.admin_enrolled`، و`profile.updated`، و`admin.user_updated` (بالقيم قبل وبعد)، و`run.created`. يقرؤه المدير فقط (`limit` من 1 إلى 1000). **ملاحظة:** الجدول `audit_log` لا يملك حماية من التعديل أو الحذف على مستوى قاعدة البيانات (لا trigger ولا صلاحيات منفصلة)، وهذه فجوة (الملف 03، H-SEC-3).

### SRS-048 — كشف القيم العامة فقط (M)
`GET /api/auth/config` يعيد فقط عنوان Supabase والمفتاح العام (anon/publishable)، ولا يعيد أي مفتاح `service_role`.

## 6) سلامة البيانات والتشغيل
### SRS-050 — ترحيلات مرقّمة ضد العبث (M)
`scripts/windows/migrate.py` يسجل اسم كل ملف ترحيل وبصمته SHA-256 في `schema_migrations`، ويرفض التشغيل إذا عُدّل ملف سبق تطبيقه.
### SRS-051 — النسخ الاحتياطي والاستعادة (S)
`scripts/windows/localdb.py backup` (صيغة pg_dump مخصصة + بيان بعدد الصفوف) و`restore <file.dump> [db]` (عبر `pg_restore`).
### SRS-052 — السجلات المحفوظة غير قابلة للتعديل عبر الـ API (M)
لا توجد نقطة نهاية لتعديل تشغيل محفوظ أو حذفه. التخزين المؤقت للعرض يفترض ثبات السجل (`main.py`، `_cached_visualization`).

## 7) اللغة والتوطين (i18n)
المصدر: `artifacts/rescue-lab/src/lib/i18n.tsx` و`src/lib/messages/` و`scripts/check_engine_translations.py`.
### SRS-060 — العربية افتراضياً (RTL) والإنجليزية (LTR) (M)
مع تبديل يُحفظ في `profiles.locale` للمستخدم المسجّل.
### SRS-061 — ترجمة نصوص المحرك العلمية عند العرض (M)
تبقى السجلات المخزّنة بالإنجليزية دون تغيير، ويُعرض النص الأصلي كتلميح. `check_engine_translations.py` يفحص أن كل جملة من المحرك لها ترجمة (STATUS.md يذكر 49/49).
### SRS-062 — أرقام لاتينية في الحقول الرقمية، ورسوم بيانية LTR (M)
لتفادي الالتباس في القيم العلمية (STATUS.md، الجولة 5).

## 8) وحدات مساندة (Research AI و Evidence)
### SRS-070 — نموذج المركّبات لا يدّعي تنبؤاً موثوقاً (M)
`eligible_for_reliable_prediction = False`. المركّب المعروف يعيد دليلاً تجريبياً وليس تنبؤاً. المركّب الجديد يعيد `prediction_available = False` و`score_is_calibrated_probability = False`. فشل التحقق من سلامة النموذج المخزّن → 503 (`research/service.py`، `main.py`، `ai_predict_compound`).
### SRS-071 — قاعدة الأدلة للقراءة فقط وبتصنيف بحثي (M)
`clinical_use_policy.classification = 'RESEARCH_ONLY'`، و21 مصدراً في الكتالوج، والبحث للقراءة فقط (`research/clinical_evidence/`).

## 9) الوسم والتنبيهات (Labeling)
### SRS-080 — تنبيه «للبحث فقط» دائم (M)
`banner.ruo` في `i18n.tsx`، وشارة `sim.badge` = "Simulated · unvalidated"، وتنبيه الشبكة الوعائية `vs.noticeBody` (*"…not clinical evidence…"*).

## 10) متطلبات غير وظيفية معروفة النقص (لم تُنفَّذ)
| المعرّف | المتطلب | الحالة |
|---|---|---|
| SRS-090 | حد لمعدل الطلبات (rate limiting) لكل مستخدم أو عنوان | **غير منفّذ** (PROJECT_AUDIT.md §4). يوجد فقط حد الحسابين المتزامنين (SRS-032) |
| SRS-091 | سجل تدقيق غير قابل للتعديل (append-only) | **غير منفّذ** |
| SRS-092 | قائمة مكونات البرنامج (SBOM) ومراقبة الثغرات | **غير منفّذ** (مطلوب ضمنياً في S6: *"Description of any security-relevant third party components used"*) |
| SRS-093 | مهلة الجلسة والمصادقة الثنائية للمدير | تعتمد على إعدادات Supabase؛ **لم يُتحقَّق منها** في هذه الجولة |
| SRS-094 | تتبّع رسمي لنسخ المتطلبات وفق عملية IEC 62304 | **غير منفّذ** |
