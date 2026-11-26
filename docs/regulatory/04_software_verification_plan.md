# 04 — خطة التحقق من البرنامج (Software Verification Plan)

> **Verification** هنا = إثبات أن البرنامج يطابق متطلباته (SRS) ويحل معادلاته بشكل صحيح. **لا يعني** أن النموذج يطابق الواقع (هذا Validation، انظر الملف 05). IEC 62304 نفسه *"does not cover validation and final release of the medical device"* (S10).
> المنتج **غير معتمد**.

## 1) سجل التشغيل الفعلي لهذه الجولة (2026-11-26)
شُغّلت الأوامر من `artifacts/api-server` بمفسّر `.venv`:

| المجموعة | الأمر | النتيجة الفعلية |
|---|---|---|
| المحرك + العرض + الحلّال + API الوعائي | `python -m unittest simulation.test_engine simulation.test_visualization vascular.test_solver vascular.test_api` | **Ran 36 tests — OK** |
| نموذج المركّبات | `python -m unittest research.test_research_ai` | **Ran 6 tests — OK** |
| قاعدة الأدلة | `python -m unittest` داخل `research/clinical_evidence` | **Ran 7 tests — OK** |
| الصلاحيات (`auth.test_auth`، 12 اختباراً) | — | **لم يُشغَّل في هذه الجولة** لأنه يحذف قاعدة اختبار مشتركة ويعيد إنشاءها، وجلسة أخرى تعمل في المجلد نفسه. STATUS.md يذكر نجاحه سابقاً (10 اختبارات وقتها؛ عددها الآن 12) |
| اختبارات المتصفح E2E (Playwright، `artifacts/rescue-lab/e2e/`) | — | **لم تُشغَّل في هذه الجولة**؛ أُضيفت حديثاً في جلسة أخرى |
| `scripts/check_engine_translations.py`، `check_simulation_workflow.py`، `check_visualization_api.py` | `scripts/windows/test-all.ps1` | **لم تُشغَّل في هذه الجولة**؛ آخر الأخيرين يحتاج الخادم الحي |

الأمر الشامل الموجود: `scripts\windows\test-all.ps1`.

## 2) ربط الاختبارات بالمتطلبات (أسماء الاختبارات حقيقية من الكود)

### `simulation/test_engine.py` — الصنف `EngineTests` (10)
| الاختبار | ماذا يثبت | SRS |
|---|---|---|
| `test_poiseuille_scaling_and_units` | الصيغة التحليلية، وتناسب Q مع ΔP، وr⁴، و1/μ | 003 |
| `test_null_crossover` | بلا تغيير لزوجة ولا إصابة: التباينات = 0 والأذرع = خط الأساس (< 1e-12) | 007، 008 |
| `test_complete_output_contract_and_finite_values` | المخرج يطابق عقد `SimulationRun`، و4 أذرع، وقيم منتهية | 006، 011، 033 |
| `test_washout_matches_integrated_mass_balance` | الغسل يطابق التكامل المستقل لميزان الكتلة (خطأ < 2e-4)، وتناقص رتيب | 005 |
| `test_concentration_bounds` | 0 ≤ المستقبِل ≤ المانح ≤ 1 | 009 |
| `test_seed_and_fingerprint_reproducibility` | تكرار مطابق تماماً | 012 |
| `test_no_hardcoded_topology_superiority` | تساوي الطرق عند تساوي الانتظار، والمتحكم التقليدي يمكن أن يتفوق | 004، 006 |
| `test_parameter_validation` | رفض: radius=0، replicates=2، NaN، seed سالب، نافذة زمنية خاطئة، حقل مجهول | 001، 002 |
| `test_fingerprint_reproducible_from_exported_config` | انحدار 1000 مقابل 1000.0؛ البصمة تُعاد من JSON المصدَّر | 012، 013 |
| `test_high_flow_limit_remains_finite` | أقصى المدى يبقى منتهياً | 005، H-NUM-2 |

### `simulation/test_visualization.py` — `VisualizationTests` (8)
| الاختبار | SRS |
|---|---|
| `test_response_contracts` | 014، 030 |
| `test_flow_velocity_area_and_units` | 014 |
| `test_pressure_boundary_and_linear_gradient` | 014 |
| `test_radial_profile_no_slip_and_flux` | 014 |
| `test_shear_matches_pressure_geometry` | 010، 014 |
| `test_zero_flow_means_zero_motion` | 004، 014 |
| `test_reverse_flow_has_signed_motion` | 006 (`reversal_detected`)، 014 |
| `test_deterministic_derivation_does_not_change_original_run` | 014، 052 |

### `vascular/test_solver.py` — `VascularSolverTests` (13)
| الاختبار | SRS |
|---|---|
| `test_single_tube_matches_analytical_poiseuille_solution` | 022، 024، 025 |
| `test_two_tubes_in_series_have_expected_pressure_drops` | 022 |
| `test_two_parallel_branches_split_flow_by_conductance` | 022، 025 |
| `test_internal_junction_mass_conservation` | 025 |
| `test_halving_radius_reduces_fixed_pressure_flow_to_one_sixteenth` | 022 |
| `test_doubling_viscosity_halves_fixed_pressure_flow` | 022 |
| `test_equal_pressure_boundaries_produce_zero_flow` | 022، 024 |
| `test_si_display_conversions` | 024 |
| `test_invalid_geometry_and_unknown_overrides_are_rejected` | 020، 023 |
| `test_invalid_graph_without_pressure_anchor_is_rejected` | 023 |
| `test_repeatability_and_fingerprint` | 026 |
| `test_fixed_inlet_flow_solves_inlet_pressure` | 020، 022 |
| `test_occlusion_preserves_flow_through_alternative_capillary_path` | 022 (انسداد) |

### `vascular/test_api.py` — `VascularAPITests` (5)
| الاختبار | SRS |
|---|---|
| `test_network_endpoint_returns_connected_stable_segment_ids` | 021، 030 |
| `test_solver_response_maps_computed_values_to_every_network_segment` | 024، 025، 026 |
| `test_radius_change_runs_python_solver_and_changes_flow` | 020، 026 |
| `test_unknown_segment_override_returns_validation_error` | 023، 031 |
| `test_fixed_flow_boundary_uses_requested_flow` | 020 |

### `auth/test_auth.py` — `AuthTests` (11) + `SupabaseBoundaryTests` (1)
تعمل على قاعدة PostgreSQL حقيقية مُرحَّلة حديثاً، ويُحاكى Supabase عند حدود HTTP فقط.
| الاختبار | SRS |
|---|---|
| `test_anonymous_can_use_public_calculations_but_not_private_endpoints` | 043 |
| `test_auth_config_exposes_only_public_values` | 048 |
| `test_invalid_token_rejected` | 040 |
| `test_unverified_email_cannot_access_protected_resources` | 041 |
| `test_unverified_admin_email_is_not_enrolled` | 045 |
| `test_users_cannot_see_each_others_runs` | 044 |
| `test_run_survives_new_connection` | 033 |
| `test_admin_enrollment_and_permissions` | 042، 043، 045، 046، 047، 041 (suspension) |
| `test_parallel_first_requests_do_not_deadlock` | 045 (انحدار deadlock) |
| `test_parallel_first_requests_for_admin_candidate` | 045 (مدير واحد فقط تحت التزامن) |
| `test_profile_update_validates_input` | 042، 060 |
| `test_valid_rejected_and_unreachable` (SupabaseBoundaryTests) | 040 |

### `research/test_research_ai.py` — `ResearchAITests` (6)
`test_real_dataset_is_clean_and_imbalanced_as_reported`، `test_structure_validation_and_deterministic_features`، `test_conformer_is_real_deterministic_geometry_and_bounded`، `test_model_integrity_and_real_heldout_inference`، `test_known_compound_returns_experimental_evidence_not_prediction`، `test_new_compound_never_claims_validated_probability_or_physics_link` ← SRS-070.

### `research/clinical_evidence/test_sync.py` (7)
`test_database_template_is_research_only`، `test_trial_parser`، `test_additive_fetch_hash_migration_preserves_template`، `test_download_json_hashes_exact_response_body`، `test_live_imported_public_records_and_source_states`، `test_search_returns_verified_aspirin_records_and_escapes_input`، `test_search_database_is_read_only` ← SRS-071.

### اختبارات المتصفح E2E (`artifacts/rescue-lab/e2e/`، لم تُشغَّل هنا)
| الملف ← الاختبار | SRS |
|---|---|
| `researcher-journey.spec.ts` ← *opens in Arabic RTL with a saved run and live engine values* | 060، 080 |
| ← *changing driving pressure recomputes flow through the Python engine* | 003، 030 |
| ← *invalid input is rejected in place and save is disabled* | 001، 031 |
| ← *anonymous save is refused with a clear sign-in message* | 043 |
| ← *switches Arabic ⇄ English, flips direction and persists after reload* | 060 |
| ← *run history lists saved runs and opens one in the lab* | 033، 044 |
| ← *analysis shows metrics and the stored reports download with provenance* | 034 |
| ← *runs the network solver and reports mass conservation* | 025 |
| ← *editing a segment radius changes the computed inlet flow* | 020 |
| ← *evidence search returns imported public records with provenance* | 071 |
| ← *anonymous visitors are sent to sign-in from private pages* | 043 |
| ← *a forged email link shows a clear invalid-link message* | 040 |
| `guided.spec.ts` ← *blocking a capillary changes the solved network flow; reopening restores it* | 022، H-UI-1 |
| ← *blocking the only feeding artery stops all perfusion and says so* | 023، H-UI-1 |
| `mobile.spec.ts` ← *mobile Arabic layout has no horizontal overflow: {path}* | 060 |

### فحوص سكربتية
`scripts/check_engine_translations.py` ← SRS-061 · `scripts/windows/migrate.py` (فحص ذاتي عند التشغيل) ← SRS-050.

## 3) الفجوات (Gaps)
| # | الفجوة | المتطلب | الأثر |
|---|---|---|---|
| G-1 | لا اختبار آلي لنموذج نفاذية الحاجز مقابل حل تحليلي (يوجد فقط `test_concentration_bounds`) | 009 | تحقق جزئي |
| G-2 | لا اختبار للتحذيرات الشرطية فرداً فرداً (Re ≥ 1، rescue > 0، cv = 0…) | 011 | تحقق جزئي |
| G-3 | لا اختبار لفواصل Student-t مقابل حساب مستقل | 007 | تحقق جزئي |
| G-4 | لا اختبار لحد التزامن 429 | 032 | غير مُتحقَّق |
| G-5 | لا اختبار لمحتوى CSV/HTML (تكرار الأصل، تهريب HTML) على مستوى الوحدة؛ يوجد فحص سير عمل حي فقط | 034 | جزئي |
| G-6 | لا اختبار لحماية آخر مدير عند **الإيقاف** (يوجد للتخفيض فقط) | 046 | جزئي |
| G-7 | لا اختبار للاستعادة الآلية من النسخة الاحتياطية (جُرّبت يدوياً فقط) | 051 | يدوي |
| G-8 | rate limiting، وسجل تدقيق append-only، وSBOM: غير منفّذة أصلاً | 090–092 | — |
| G-9 | اختبارات E2E وauth لم تُشغَّل في هذه الجولة | متعدد | يجب تشغيلها قبل أي ادعاء |
| G-10 | لا يوجد تكامل مستمر (CI) يشغّل الاختبارات تلقائياً عند كل تغيير. سجل git بدأ في 2026-11-26 بنقطة حفظ واحدة (`8f6f4fc`)، ولا يربط أي commit بنتيجة اختبار | 094 | لا دليل تاريخي على النجاح |
| G-11 | لا اختبار تغطية كود (coverage) مقيس | — | مجهول |
| G-12 | لا توجد خطة تحقق رسمية معتمدة قبل التنفيذ (الاختبارات كُتبت مع الكود) | IEC 62304 (S10) | فجوة عملية |

## 4) الخطوات الموصى بها
1. تشغيل `test-all.ps1` كاملاً واختبارات E2E، وحفظ المخرجات النصية مؤرخة في `docs/regulatory/evidence/`.
2. إضافة اختبارات G-1 إلى G-6.
3. إعداد CI يشغّل كل الاختبارات عند كل commit.
4. تجميد النسخة (tag) وربط تقرير الاختبار بالبصمة ورقم النسخة.
