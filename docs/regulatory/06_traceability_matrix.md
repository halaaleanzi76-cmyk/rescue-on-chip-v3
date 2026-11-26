# 06 — مصفوفة التتبع (Traceability Matrix)

> متطلب (الملف 02) ↔ خطر/ضابط (الملف 03) ↔ اختبار (الملف 04) ↔ حالة. المنتج **غير معتمد**.
> **مفتاح الحالة:**
> - ✅ **Verified (run 2026-11-26)**: الاختبار شُغّل اليوم ونجح.
> - 🟡 **Tested, not re-run**: يوجد اختبار آلي لكنه لم يُشغَّل في هذه الجولة (auth أو E2E أو سكربت).
> - 🟠 **Partial**: يُختبر جزء من المتطلب فقط.
> - 🔵 **Inspection only**: مُتحقَّق بقراءة الكود، بلا اختبار آلي.
> - ❌ **Not implemented / gap**.
>
> لا تعني أي حالة هنا تحققاً علمياً (validation) ولا سريرياً (الملف 05).

| SRS | الموضوع | ضابط للخطر | الاختبار/الدليل | الحالة |
|---|---|---|---|---|
| 001 | نطاقات المدخلات | H-NUM-2، H-UI-3 | `test_parameter_validation`؛ E2E *invalid input is rejected in place…* | ✅ (+🟡 E2E) |
| 002 | النافذة الزمنية | H-NUM-2 | `test_parameter_validation` (duration=20, switch=18) | ✅ |
| 003 | Poiseuille وSI | H-NUM-1 | `test_poiseuille_scaling_and_units` | ✅ |
| 004 | 3 طرق تبديل مفروضة | H-MIS-4، H-MOD-1 | `test_no_hardcoded_topology_superiority`، `test_zero_flow_means_zero_motion` | ✅ (صحة المعادلة فقط؛ **العابرات غير مقيسة**) |
| 005 | الغسل | H-NUM-2، H-NUM-3 | `test_washout_matches_integrated_mass_balance`، `test_high_flow_limit_remains_finite` | ✅ |
| 006 | مقاييس الطرق | H-MIS-4 | `test_complete_output_contract_and_finite_values`، `test_reverse_flow_has_signed_motion` | ✅ |
| 007 | 2×2 وفواصل t | H-MIS-3 | `test_null_crossover` | 🟠 (لا تحقق مستقل لفواصل t، G-3) |
| 008 | التباينات | H-MIS-1 | `test_null_crossover` | 🟠 (حالة الصفر فقط) |
| 009 | نفاذية الحاجز | H-MIS-1 | `test_concentration_bounds` | 🟠 (G-1) |
| 010 | كميات مشتقة | H-NUM-1 | `test_shear_matches_pressure_geometry` | 🟠 (Re والمقاومة بالفحص فقط) |
| 011 | افتراضات وتحذيرات | **H-MIS-1، H-MIS-3** | `test_complete_output_contract_and_finite_values` (وجود الحقول) | 🟠 (G-2) |
| 012 | البصمة وإعادة الإنتاج | H-REP-1 | `test_seed_and_fingerprint_reproducibility`، `test_fingerprint_reproducible_from_exported_config` | ✅ |
| 013 | نسخة النموذج | H-REP-1 | `test_fingerprint_reproducible_from_exported_config` | ✅ |
| 014 | حقول العرض | H-MIS-1 | 8 اختبارات `test_visualization.py` | ✅ |
| 020 | مدخلات الحلّال | H-NUM-4 | `test_invalid_geometry_and_unknown_overrides_are_rejected`، `test_fixed_inlet_flow_solves_inlet_pressure`، `test_radius_change_runs_python_solver_and_changes_flow` | ✅ |
| 021 | الشبكة المثالية + الإفصاح | **H-MIS-2** | `test_network_endpoint_returns_connected_stable_segment_ids` (يتحقق من "not measured") | ✅ |
| 022 | الحل العددي | H-NUM-1، H-NUM-3 | 7 اختبارات تحليلية في `test_solver.py` + `test_occlusion_preserves_flow_through_alternative_capillary_path` | ✅ |
| 023 | رفض الحالات غير المعرّفة | H-NUM-4 | `test_invalid_graph_without_pressure_anchor_is_rejected`، `test_unknown_segment_override_returns_validation_error` | ✅ |
| 024 | مخرجات المقاطع | H-NUM-1 | `test_si_display_conversions`، `test_single_tube_matches_analytical_poiseuille_solution` | ✅ |
| 025 | بقايا الكتلة | H-NUM-3 | `test_internal_junction_mass_conservation`، `test_solver_response_maps_computed_values_to_every_network_segment` | ✅ |
| 026 | بصمة الحلّال | H-REP-1 | `test_repeatability_and_fingerprint` | ✅ |
| 030 | نقاط النهاية | — | اختبارات API + `scripts/check_simulation_workflow.py` | ✅ جزئياً / 🟡 |
| 031 | أخطاء 422/500 | H-NUM-4 | `test_unknown_segment_override_returns_validation_error` | 🟠 (500 غير مختبر) |
| 032 | حد التزامن 429 | H-SEC-4 | — | 🔵 (G-4) |
| 033 | حفظ السجل والتحقق من العقد | H-DAT-1 | `test_run_survives_new_connection` | 🟡 |
| 034 | التقارير مع الأصل | H-REP-1 | E2E *analysis shows metrics and the stored reports download with provenance* | 🟡 (G-5) |
| 035 | إعلان «unvalidated» | **H-MIS-1** | فحص `main.py` `model()` | 🔵 |
| 040 | التحقق من الرمز | H-SEC-2 | `test_invalid_token_rejected`، `test_valid_rejected_and_unreachable` | 🟡 |
| 041 | بريد غير مؤكد/موقوف | H-SEC-2 | `test_unverified_email_cannot_access_protected_resources`، `test_admin_enrollment_and_permissions` | 🟡 |
| 042 | الأدوار من القاعدة | H-SEC-2 | `test_profile_update_validates_input` | 🟡 |
| 043 | مصفوفة الصلاحيات | H-SEC-2 | `test_anonymous_can_use_public_calculations_but_not_private_endpoints`، `test_admin_enrollment_and_permissions` | 🟡 |
| 044 | العزل 404 | H-SEC-1 | `test_users_cannot_see_each_others_runs` | 🟡 |
| 045 | المدير الأول | H-SEC-2 | `test_unverified_admin_email_is_not_enrolled`، `test_parallel_first_requests_for_admin_candidate`، `test_parallel_first_requests_do_not_deadlock` | 🟡 |
| 046 | حماية آخر مدير | H-SEC-2 | `test_admin_enrollment_and_permissions` (التخفيض) | 🟡 / 🟠 (G-6) |
| 047 | سجل التدقيق | H-SEC-3 | `test_admin_enrollment_and_permissions` (`auth.admin_enrolled`) | 🟡 / ❌ immutability |
| 048 | القيم العامة فقط | H-SEC-5 | `test_auth_config_exposes_only_public_values` | 🟡 |
| 050 | ترحيلات SHA-256 | H-DAT-2 | `migrate.py` (فحص ذاتي) | 🔵 |
| 051 | نسخ واستعادة | H-DAT-1 | استعادة يدوية (PROJECT_AUDIT §0) | 🔵 (G-7) |
| 052 | ثبات السجلات | H-REP-1 | `test_deterministic_derivation_does_not_change_original_run`؛ لا نقطة تعديل | 🔵 / ✅ |
| 060 | AR/EN وRTL | H-UI-2 | E2E *switches Arabic ⇄ English…*، `mobile.spec.ts` | 🟡 |
| 061 | ترجمة نص المحرك | H-MIS-1 | `scripts/check_engine_translations.py` | 🟡 |
| 062 | أرقام لاتينية | H-UI-2 | فحص متصفح يدوي (STATUS.md) | 🔵 |
| 070 | لا تنبؤ موثوق للمركّبات | **H-MIS-5** | 6 اختبارات `test_research_ai.py` | ✅ |
| 071 | الأدلة للقراءة فقط | H-MIS-1 | 7 اختبارات `test_sync.py` | ✅ |
| 080 | تنبيه للبحث فقط | **H-MIS-1** | E2E *opens in Arabic RTL…* (عرض الصفحة)؛ فحص `i18n.tsx` | 🔵 / 🟡 |
| — | عرض حالة الانسداد مطابق للحساب | **H-UI-1** | `guided.spec.ts` (2 اختبار انسداد) | 🟡 (الإصلاح جارٍ في جلسة أخرى) |
| 090 | Rate limiting | H-SEC-4 | — | ❌ |
| 091 | سجل تدقيق append-only | H-SEC-3 | — | ❌ |
| 092 | SBOM ومراقبة الثغرات | HB-7 | — | ❌ |
| 093 | مهلة الجلسة و2FA للمدير | H-SEC-2، HB-7 | — | ❌ لم يُتحقَّق |
| 094 | عملية IEC 62304 | كل المخاطر | — | ❌ |
| — | **Validation مقابل قياس** | **H-MOD-1** | — | ❌ (الملف 05) |
| — | أدلة سريرية للاستخدام (B) | HB-1، HB-2، HB-3 | — | ❌ (الملف 07) |

## ملخص
- 53 صفاً؛ **19** منها تبدأ حالتها بـ ✅ (مُتحقَّق منها بتشغيل اليوم، حسابياً فقط)، وصف واحد (030) ✅ جزئياً.
- أعلى خطرين (H-MIS-1، H-MOD-1): ضوابط H-MIS-1 إفصاحية، معظمها مُتحقَّق بالفحص لا بالاختبار؛ وH-MOD-1 **بلا ضابط تقني ممكن** حتى تتوفر بيانات مختبرية.
- قبل أي ادعاء علني بأن «كل الاختبارات تنجح»: شغّل `scripts\windows\test-all.ps1` وE2E، واحفظ المخرجات (الملف 04، القسم 4).
