# Rescue-on-Chip v3: verified status (2026-11-26)

Working copy of `Downloads\rescue-on-chip-clean`. The original was not modified.
Statuses follow the project mandate: VERIFIED WORKING / IMPLEMENTED - NOT SCIENTIFICALLY VALIDATED /
BLOCKED BY EXTERNAL DEPENDENCY / NOT IMPLEMENTED / NOT TESTABLE.

# Competition build (2026-11-26) — Neuro-Reflow Rescue 3.0
| Item | Status | Evidence |
|---|---|---|
| Light competition identity, original SVG logo (horizontal/compact/light/dark + favicon), Inter + IBM Plex Sans Arabic | VERIFIED WORKING | `docs/screenshots/*` |
| Pages: Home · The Problem · Rescue-on-Chip · Research Simulation (`/lab`) · Scientific Validation · Results · Evidence · Judge Mode | VERIFIED WORKING | `e2e/competition.spec.ts`, mobile overflow checks on all routes |
| Compound lab and AI modules removed from the active site (source files kept) | DONE | routes removed in `App.tsx` |
| Experiment A (2×2), B (A/B/C, computed ranking — B wins at 15 s wait), C (sensitivity sweep `/api/sensitivity`) | VERIFIED WORKING | E2E judge + sensitivity tests |
| Validation lab: A 24/24 PASS · synthetic 9/10 (one pre-registered negative finding) · empirical NOT POSSIBLE · clinical NOT PERFORMED | VERIFIED WORKING | `/api/validation/run` |
| Evidence package (PDF, CSV, JSON, 4× MD) generated from real engine runs | VERIFIED WORKING | `scripts/generate_evidence_package.py` → `REAL_WORLD_VALIDATION_EVIDENCE/package/` + `/evidence/*` |
| Tests | VERIFIED WORKING | `test-all.ps1`: 0 suites failed; Playwright 33/33; production build passes |
| Public hosting | BLOCKED BY EXTERNAL DEPENDENCY | no hosting account configured; runs locally |

## Start
Open this folder in Cursor and press **Ctrl+Shift+B** (task "Start Rescue-on-Chip"), or run `.\start.ps1`.
App: http://localhost:5173 · API docs: http://127.0.0.1:8000/api/docs · Stop: `.\stop.ps1`
Tests: Cursor task "Run all scientific + API tests" (`scripts\windows\test-all.ps1`).

## What was fixed for Windows (this pass)
| Problem | Fix |
|---|---|
| `npm install` failed (`catalog:` protocol) | Uses pnpm. The root `preinstall` used `sh -c` (not available in cmd), so it was rewritten in Node |
| Linux-only lockfile: missing Windows binaries for lightningcss, Tailwind oxide, esbuild | Pinned `*-win32-x64-msvc` / `@esbuild/win32-x64` at the root (same pattern the project already used for Rollup) |
| No PostgreSQL on Windows | `pgserver` (real PostgreSQL 16.2 binaries, no admin rights). Data in `.data\pg` |
| Schema only applied via `drizzle-kit push` (not versioned) | `db/migrations/NNN_*.sql` + `schema_migrations` with SHA-256 tamper check (`scripts\windows\migrate.py`) |
| Frontend had no `/api` route locally (Replit router did it) | Vite dev/preview proxy via `API_PROXY_TARGET` |
| `with sqlite3.connect()` never closes the connection, so files stay locked on Windows | `contextlib.closing` in the importer and its test |
| Check scripts hard-coded `localhost:80` | `RESCUE_API_BASE`, defaulting to the local API |
| PowerShell 5.1 misread UTF-8 punctuation | ASCII-only launch scripts |

## Status
| Item | Status | Evidence |
|---|---|---|
| Persistent PostgreSQL database | VERIFIED WORKING | Full stop (incl. Postgres) → start; saved run `7caa478a…` reloaded |
| Versioned migrations | VERIFIED WORKING | Applied once, idempotent on re-run |
| Database backup | IMPLEMENTED | `localdb.py backup` → JSON snapshot. Restore script not yet written |
| Windows one-click start + health checks | VERIFIED WORKING | `start.ps1` → API, web, proxy all `OK` |
| Cursor task (Ctrl+Shift+B) | IMPLEMENTED | `.vscode/tasks.json`. The launcher it calls is verified |
| API (FastAPI) | VERIFIED WORKING | `check_simulation_workflow.py`, `check_visualization_api.py` passed live |
| Frontend: all 8 pages render with live data | VERIFIED WORKING | Browser check of `/`, `/vascular`, `/research-ai`, `/evidence`, `/analysis`, `/compare`, `/runs`, `/model`. 0 console errors |
| 3D laboratory (original assets preserved) | VERIFIED WORKING (renders) | Screenshot, WebGL scene loads |
| Save / reload / compare experiments | VERIFIED WORKING | API workflow checks + UI |
| Reports (printable HTML, CSV, reproducibility JSON) | VERIFIED WORKING via API | Native PDF is not offered (by design: print to PDF) |
| Production build | VERIFIED WORKING | `vite build` OK (1.9 MB main chunk: code-splitting recommended) |
| TypeScript typecheck | VERIFIED WORKING | All packages |
| Switching / washout / 2×2 engine | IMPLEMENTED - NOT SCIENTIFICALLY VALIDATED | 9 + 8 numerical tests pass. Transients are prescribed RC models, not measured |
| Vascular Poiseuille network solver | IMPLEMENTED - NOT SCIENTIFICALLY VALIDATED | 13 + 5 tests (mass balance, analytical checks). Geometry is illustrative, not anatomy |
| AID1288 compound model | IMPLEMENTED - NOT SCIENTIFICALLY VALIDATED | 6 tests pass. Reliability gate intentionally closed. Not yet re-audited this pass |
| Evidence catalog (21 sources) | PARTIAL | 3 sources have live HTTP-200 fetches recorded (ClinicalTrials.gov, 2× openFDA). The rest are catalog-only. Still SQLite, not migrated to Postgres |
| Authorization server-side (roles, ownership, admin enrollment, suspension, audit) | VERIFIED WORKING (tests) | `auth.test_auth`: 10 tests on a fresh migrated Postgres DB, Supabase mocked only at HTTP |
| Data isolation between users | VERIFIED WORKING (tests) | Other users and anonymous visitors get 404 on private runs, visualizations and reports |
| Real sign-up + email verification (Supabase project `zztmrihkanqxqlvptsac`) | VERIFIED WORKING | Owner signed up, received the real email, confirmed. Profile stored with `email_verified_at` |
| Initial admin enrollment (halaaleanzi76@gmail.com) | VERIFIED WORKING | DB: role=admin, status=active. Audit: `auth.profile_created` → `auth.admin_enrolled` |
| Token validation against live Supabase | VERIFIED WORKING | No token → 401. Forged token → Supabase 403 → API 401 |
| Email delivery via custom SMTP (Gmail) | VERIFIED WORKING (owner report) | SMTP saved in Supabase; the email rate-limit field unlocked (proof custom SMTP is active) and was raised. Bilingual templates in `supabase/email-templates/` |
| Password reset (real email) | VERIFIED WORKING (owner report) | Reset email received, new password set via `/reset-password`, sign-in with new password succeeded. Recovery link is robust to Supabase redirect fallback |
| Second real user signs in as non-admin | VERIFIED WORKING | DB: second profile role=researcher, verified. Admin count stays 1. 0 server errors |
| Cross-user isolation with real accounts | VERIFIED IN TESTS ONLY | `auth.test_auth` proves it on real Postgres. Live check needs a run saved by one real account and opened by the other (no private runs exist yet) |
| Admin dashboard (users, roles, status, audit log) | IMPLEMENTED | `/admin`. Redirect for anonymous visitors verified in browser |
| i18n architecture, AR (default, RTL) / EN (LTR), switch + persistence | VERIFIED WORKING | Browser: `dir`/`lang` switch, Plex Arabic font, mobile 375 px with no overflow |
| Translated UI: all 8 scientific pages + shell, auth, account, admin, 404, validation and error messages | VERIFIED WORKING | Browser scan of every page in Arabic: no untranslated UI text remains. English mode: 0 Arabic words, LTR. Dictionaries in `src/lib/messages/` (Arabic keys type-checked against English) |
| Engine-generated scientific text in Arabic (assumptions, warnings, visualization notes, solver and AI-model notes) | VERIFIED WORKING | Translated at display time, so stored run records stay unchanged. The original English shows as a tooltip. `scripts/check_engine_translations.py`: 49/49 sentences covered (part of test-all) |
| Language preference saved to the account | IMPLEMENTED | Switching while signed in saves `profiles.locale`. Applied on next sign-in/device. Not yet tried across two devices |
| Left in original language on purpose | BY DESIGN | User data (experiment names, IDs), imported source records (trial titles, FDA label text, catalog entries) to stay identical to source + checksum. A note on the evidence page says so |
| ISLES 2024 / patient-specific pathway | NOT IMPLEMENTED | Large dataset. Licence and size review needed before download |
| Extended schema (users, datasets, provenance, models, audit…) | NOT IMPLEMENTED | Only `simulation_runs` + `schema_migrations` exist |
| Source-grounded AI assistant | NOT IMPLEMENTED | Optional. Needs API key |

## Fixed in round 2
- **Reproducibility bug (original engine):** float fields had integer defaults, so the default run's fingerprint could not be recomputed from its own exported config (`1000` vs `1000.0`). Fixed with `validate_default=True`. Engine bumped to `bench-1.0.2` (numerics unchanged). Regression test added. Historical runs keep their stored version.
- Failed saves were silent in the UI. A global handler now shows translated 401/403/server errors.
- The 404 page was a template placeholder. It is now a real, translated page.
- The OpenAPI generator (`scripts/generate_simulation_contract.py`) only covers the original simulation endpoints. Auth/admin endpoints use the typed `apiJson` helper in `src/lib/auth.tsx`.

## Fixed in round 3 (found during the real first sign-in)
- **Deadlock on first sign-in:** the browser fires `/me`, `/runs` and `/summary` together. Admin enrollment upgraded its table lock after the INSERT, PostgreSQL detected a deadlock, and one request returned 500. The lock is now taken first and only for the admin candidate. Regression test `test_parallel_first_requests_for_admin_candidate` reproduces `DeadlockDetected` on the old code and passes on the fix.

## Fixed in round 4
- Rate-limit messages now distinguish Supabase's per-address cooldown (shows seconds) from the project's hourly email cap (says where to raise it). Same-password and weak-password errors have their own messages.
- The reset link now always ends on the new-password form (PASSWORD_RECOVERY event plus `?code=` forwarding), even if Supabase falls back to the Site URL.
- Sign-out no longer fires a token-less `/api/me` (seen as 401s in the log). The profile cache is dropped instead of refetched.

## Fixed in round 5 (localization)
- Numeric inputs showed Arabic-Indic digits under `lang=ar` (browser auto-localization). Numeric inputs now force Latin digits, so scientific values stay unambiguous.
- Recharts axis text could mirror under RTL. Charts are pinned to LTR, the scientific convention. Arabic labels inside still render correctly.
- The AI retrain button was visible to everyone though the API restricts it to admins. Non-admins now see a clear note instead.

## Round 6: E2E, verification evidence, independent-data check (2026-11-26)
| Item | Status | Evidence |
|---|---|---|
| Browser E2E (Playwright, real platform, system Edge) | VERIFIED WORKING | 20 desktop + 5 mobile tests pass: lab recompute on input change, validation, anonymous save refused, language switch, history→lab, analysis + report downloads, comparison, vascular solve and mass balance, radius change alters flow, evidence search, RDKit descriptors, private-page redirects, forged email link, no mobile overflow. A deliberate must-fail canary failed as expected |
| Flaky 409 on a new user's parallel first requests | FIXED | Email-index race before the ON CONFLICT(id) arbiter. Retry when the row is the same user. Auth suite 8/8 runs pass (was ~1 in 4 failing) |
| Restorable DB backup | VERIFIED WORKING | `localdb.py backup` → pg_dump. `restore` into a scratch DB: row counts MATCH |
| Verdict A: mathematical verification | VERIFIED WORKING | `REAL_WORLD_VALIDATION_EVIDENCE/runs/run_verification.py`: 24/24 checks against independent references (expm, dense nodal solver, exact washout) + 36 unit tests. Part of test-all |
| Verdict B: agreement with independent measurements | NOT POSSIBLE WITH AVAILABLE DATA | PMIDs 40160088, 41078791, 41808629 retrieved and assessed. None measures quantities the engines predict. 0 datasets used numerically. See `REAL_WORLD_VALIDATION_EVIDENCE/EVIDENCE_REPORT.md` |
| Verdict C: clinical validation | NOT IMPLEMENTED | Research-use tool. No clinical data linked to model outputs |
| Vascular occlusion control | VERIFIED WORKING | Select any segment (new accessible dropdown) → block/reopen → solver receives `occluded_segment_ids`. E2E: blocking a capillary lowers inlet flow, reopening restores it exactly; blocking the feeding artery gives 0 µL/min with a clear no-flow notice |
| Guided research mode / Advanced mode | VERIFIED WORKING | Guided shows the 5 inputs that drive the central question with inline explanations. Advanced shows all 26. Choice persists (E2E) |
| "Explain this experiment" reference tour (8 steps, AR/EN) | VERIFIED WORKING | Auto-opens on first visit. Buttons load the reference config, select 3D parts, play the switch, change equalization wait. E2E proves the engine recomputes and the equalized peak deviation rises when wait = 0 |
| Latin digits in numeric inputs | FIXED | Chromium `type=number` ignored `lang` and showed Arabic-Indic digits. Numeric fields are now text + decimal keypad, validated by our own code |
| 3D component assembly | NOT IMPLEMENTED | PROJECT_AUDIT.md A1 |

## Blockers that need the owner
1. **Real email verification / password reset**: needs an email-capable auth provider (for example a Supabase project or SMTP/Resend credentials). The software cannot verify real email without one.
2. **Admin enrollment** for the designated address depends on (1).
3. **ISLES 2024**: confirm licence terms and the download size you accept before ingestion.

## Note on the earlier TypeScript draft engine
The `lib/sim/engine.ts` drafted earlier in this conversation (outside this repo) modelled BBB injury and
viability with invented coefficients. It is **not** used here. The original Python engine is more
scientifically conservative and remains the computational core.
