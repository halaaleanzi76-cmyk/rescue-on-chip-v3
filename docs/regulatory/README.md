# ملف الجاهزية التنظيمية — Rescue-on-Chip V3 (Regulatory Readiness Pack)

> ## ⚠️ تنبيه أساسي — اقرأ أولاً
> **هذا المنتج غير معتمد (NOT APPROVED)** من الهيئة العامة للغذاء والدواء (SFDA) ولا من أي جهة تنظيمية أخرى.
> **ليس جهازاً طبياً، ولا يُستخدم لأي قرار سريري** (تشخيص، علاج، فرز مرضى، أو متابعة مريض).
> لا يحمل أي شهادة (ISO 13485 أو IEC 62304 أو غيرها)، ولم يُتحقَّق منه علمياً مقابل بيانات مقيسة (No validation against measured data)، ولا توجد أي أدلة سريرية (No clinical evidence).
> المقترح الأصلي ينص على: *"CONCEPT STAGE • RESEARCH USE ONLY"* وعلى أن المنصة *"must not be connected to a patient"* (`attached_assets/Neuro_Reflow_Rescue_3_Rescue_on_Chip_Proposal_EN_1795398607342.pdf`، الصفحتان 1 و7).

هذه الوثائق **خطة وتحليل فجوات (gap analysis)**، وليست ملفاً تقنياً مقدَّماً لجهة تنظيمية. الغرض منها أن تعرض للجنة تحكيم أو لشريك مستقبلي الوضع الحالي بصدق، وماذا يلزم للوصول إلى مسار SFDA إن قرر الفريق مستقبلاً تحويل المنصة إلى برنامج طبي (SaMD).

تاريخ الإعداد: 2026-11-26 · نسخة المحرك: `bench-1.0.2` · نسخة الحلّال الوعائي: `vascular-poiseuille-network-0.1.0`

## الفهرس

| # | الملف | المحتوى |
|---|---|---|
| 01 | [01_intended_use.md](01_intended_use.md) | الاستخدام المقصود: (A) الحالي البحثي، و(B) استخدام سريري افتراضي مستقبلي مع التصنيف المرجّح |
| 02 | [02_software_requirements_spec.md](02_software_requirements_spec.md) | مواصفات متطلبات البرنامج (SRS-xxx) مستخرجة من الكود الفعلي |
| 03 | [03_risk_management_file.md](03_risk_management_file.md) | تحليل المخاطر على نمط ISO 14971 للاستخدامين |
| 04 | [04_software_verification_plan.md](04_software_verification_plan.md) | ربط الاختبارات الآلية الحقيقية بالمتطلبات + الفجوات |
| 05 | [05_scientific_validation_plan.md](05_scientific_validation_plan.md) | تقييم الموثوقية على نمط ASME V&V 40، والفصل بين التحقق الحسابي والتحقق العلمي |
| 06 | [06_traceability_matrix.md](06_traceability_matrix.md) | مصفوفة التتبع: متطلب ↔ ضابط خطر ↔ اختبار ↔ حالة |
| 07 | [07_clinical_evaluation_gap_analysis.md](07_clinical_evaluation_gap_analysis.md) | الأدلة السريرية المطلوبة للاستخدام (B) مقابل الموجود (لا شيء) |
| 08 | [08_regulatory_roadmap.md](08_regulatory_roadmap.md) | خارطة طريق مرحلية واقعية واعتمادها على جهات خارجية |

## قواعد كتابة هذه الوثائق
1. كل ادعاء عن الكود يشير إلى ملف حقيقي في المستودع (مسار + اسم دالة أو اختبار) ويمكن التحقق منه.
2. كل ادعاء تنظيمي خارجي يشير إلى مصدر رسمي في الجدول أدناه. ما لم نستطع التحقق منه مذكور صراحة كـ **«غير مُتحقَّق منه»**.
3. لا نذكر نص بنود المعايير المدفوعة (ISO/IEC) حرفياً، لأننا لا نملك نسخها الرسمية. نذكر فقط العنوان والنطاق المنشور، أو ما نقلته وثيقة SFDA/FDA عنها.
4. نتائج الاختبارات المذكورة هي نتائج تشغيل فعلي بتاريخ 2026-11-26 (انظر الملف 04)، ولا نذكر أي نتيجة لم تُشغَّل.

## المصادر الرسمية (تاريخ الوصول لجميعها: 2026-11-26)

| الرمز | الوثيقة | الإصدار / التاريخ | الرابط |
|---|---|---|---|
| S1 | SFDA **MDS-REQ 1** Requirements for Medical Devices Marketing Authorization | V6، 19/12/2021 | https://www.sfda.gov.sa/sites/default/files/2021-12/REQ1En_0.pdf |
| S2 | SFDA **MDS-G008** Guidance on Medical Devices Classification | V2.0، 13/12/2022 | https://www.sfda.gov.sa/sites/default/files/2022-12/MDS%E2%80%93G008.pdf |
| S3 | SFDA **MDS-G23** Guidance on Software as a Medical Device (يضم وثائق IMDRF N10 وN12 وN23 وN41) | V1.0، 9/4/2018 | https://www.sfda.gov.sa/sites/default/files/2020-03/MDS_G23.pdf |
| S4 | SFDA **MDS-G010** Guidance on AI/ML technologies based Medical Devices | V1.0، 29/11/2022 | https://www.sfda.gov.sa/sites/default/files/2023-01/MDS-G010ML.pdf |
| S5 | SFDA **MDS-G027** Guidance on Digital Health Products | V1.0، 11/8/2025 | https://www.sfda.gov.sa/sites/default/files/2025-08/MDS-G027.pdf |
| S6 | SFDA **MDS-G38** Guidance to Pre-Market Cybersecurity of Medical Devices | V1.0، 18/6/2019 | https://sfda.gov.sa/sites/default/files/2019-10/MDS-G38.pdf |
| S7 | SFDA **MDS-REQ 2** Requirements for Clinical Trials of Medical Devices | V5.0، 11/06/2024 | https://sfda.gov.sa/sites/default/files/2024-07/MDS-REQ2_En_V5.pdf |
| S8 | SFDA **MDS-G024** Guidance for ISO 13485 Requirements and Corresponding SFDA-MDS Requirements | V1.0، 25/03/2025 | https://www.sfda.gov.sa/sites/default/files/2025-03/MDS-G024.pdf |
| S9 | US FDA, *Assessing the Credibility of Computational Modeling and Simulation in Medical Device Submissions* (final guidance، يعتمد مفاهيم ASME V&V 40-2018) | 17 Nov 2023 | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/assessing-credibility-computational-modeling-and-simulation-medical-device-submissions |
| S10 | IEC 62304 *Medical device software — Software life cycle processes* (صفحة الكتالوج الرسمي) | Ed. 1.0، 2006-05-09؛ نسخة موحّدة +AMD1:2015؛ "Stability date 2028" | https://webstore.iec.ch/en/publication/6792 |
| S11 | IEC 62366-1 *Application of usability engineering to medical devices* | Ed. 1.0، 2015-02-24؛ نسخة موحّدة +AMD1:2020 | https://webstore.iec.ch/en/publication/21863 |

**غير مُتحقَّق منه في هذه الجولة** (صفحات الكتالوج رفضت الوصول الآلي أو لم توجد): صفحات iso.org لكل من ISO 14971:2019 وISO 13485:2016 وISO 14155:2020 وIEC 82304-1 (HTTP 403)، وصفحة ASME V&V 40 (HTTP 404)، وIEC 81001-5-1، وموقع imdrf.org (انتهت المهلة)، بما في ذلك وجود وثيقة IMDRF أحدث تحل محل N12. ما نذكره عن هذه المعايير منقول فقط عن وثائق SFDA/FDA التي تشير إليها (مثلاً MDS-G010 يشير إلى "Clause 9 of ISO 14971:2019" وإلى AAMI CR34971:2022، وMDS-REQ 2 يشير إلى ISO 14155، وMDS-G024 يذكر العنوان الكامل لـ ISO 13485:2016).

ملاحظة مهمة عن MDS-G23: مقدمته تنص على أن مبادئ IMDRF المضمّنة *"do not reflect SFDA regulatory requirements and are intended only to be considerations"* (S3، الصفحة 2). لذلك نستخدم مصفوفة IMDRF للمقارنة فقط، والتصنيف الملزم في السعودية هو قواعد MDS-REQ 1 الملحق (5) كما يشرحها MDS-G008.
