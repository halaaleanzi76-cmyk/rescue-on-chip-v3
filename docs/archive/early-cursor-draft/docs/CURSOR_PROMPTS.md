# برومبتات Cursor — خطوة بخطوة

**طريقة الاستخدام:** افتح مجلد المشروع في Cursor، وافتح الـ Chat (Ctrl+L) على وضع **Agent**.
الصق البرومبت الأول، ولا تنتقل للي بعده إلا إذا اشتغل كل شي وجربته بنفسك.
البرومبتات مكتوبة بالإنجليزي لأن Cursor يعطي نتائج أدق كذا.

---

## 0) التجهيز
```
Read .cursor/rules/project.mdc, docs/PLATFORM_SPEC.md, docs/SIMULATION_MODEL.md, prisma/schema.prisma and lib/sim/engine.ts.
Scaffold a Next.js 15 App Router project IN THIS FOLDER (do not overwrite existing files) with TypeScript strict,
Tailwind v4, ESLint, src-less layout, import alias "@/*". Install: prisma@6 @prisma/client@6 zod recharts framer-motion
lucide-react next-intl @supabase/supabase-js @supabase/ssr tsx vitest @playwright/test, and init shadcn/ui
(button card tabs dialog slider select badge table tooltip sonner sheet progress).
Add package.json: "prisma": {"seed": "tsx prisma/seed.ts"} and scripts "db:push", "db:seed", "sim:check": "node lib/sim/engine.check.ts", "test": "vitest".
Exclude lib/sim/engine.check.ts from tsconfig. Run `npm run sim:check` and `npx tsc --noEmit` and fix any errors.
```

## 1) قاعدة البيانات
```
Using .env (copied from .env.example), run `npx prisma db push` then `npx prisma db seed`.
Create lib/db/prisma.ts (singleton client) and typed data-access functions in lib/db/: experiments.ts, runs.ts, library.ts, analysis.ts.
Write Vitest tests for engine functions (port lib/sim/engine.check.ts assertions into lib/sim/engine.test.ts).
```

## 2) الهيكل، اللغات، التصميم
```
Build the app shell: next-intl with locales ar (default, RTL) and en; messages/ar.json + messages/en.json.
Sidebar navigation (Mission Control, Virtual Lab, Experiments, Manifold Arena, Library, Sweep, Readiness, Learn),
top bar with locale switch + theme toggle (dark "lab" theme default, light "clinical" theme), and the mandatory footer
disclaimer. Design language: deep navy (#0F1E2E) + teal (#0E7C86) accents like the proposal PDF, glassy cards,
IBM Plex Sans Arabic + Inter fonts, subtle grid background, framer-motion page transitions. Make it look premium.
```

## 3) المختبر الافتراضي الحي (أهم صفحة)
```
Build /lab per PLATFORM_SPEC §3.2. Components in components/lab/:
- ChipSchematic.tsx: animated SVG of Reservoir A/B → manifold (bypass + valve) → Chip 1 / Chip 2 → readout box.
  Animated particles along tubing paths, speed proportional to current flow; 64 microchannels drawn in each chip,
  occluded ones red; bubbles as white circles; valve rotates on switch.
- ControlPanel.tsx: sliders/selects for pressure, perfusate, vessel, manifold, intervention, seed (+ randomize).
- StateStepper.tsx: S0→S4 with required checks from the run's `states`.
- LiveCharts.tsx: Recharts streaming pressure % and flow; playback the trace in real time with play/pause/speed (1x/4x/10x).
- ChaosPanel.tsx: inject bubble / leak / spike / viscosity mismatch by overriding engine params, show interlock alerts (sonner toasts).
- EndpointCards.tsx: the 9 endpoints with units, green/red vs proposal targets (≤5% deviation, ≤5% carryover).
Use simulateRun from lib/sim/engine.ts in a Web Worker (lib/sim/worker.ts). Add "Save run to experiment" button.
Encode the config in the URL (?seed=&cfg=) so runs are shareable.
```

## 4) معالج التجارب + النتائج
```
Build /experiments (list with filters), /experiments/new (5-step wizard per PLATFORM_SPEC §3.3, visual 2x2 matrix builder,
chip randomization across batches, blind codes, preregistration lock with SHA-256 via Web Crypto), and Server Action
runExperiment(id) that simulates all arms × replicates (seed = masterSeed*1000 + index), stores Run/RunTrace/StateTransition/
SafetyEvent/EndpointResult, then stores AnalysisResult (analyze2x2 on occlusionFraction and perfusionIndex_pct, twoAxisVerdict
for each intervention vs vehicle). Every mutation writes AuditLog.
Build /experiments/[id] per §3.4: 2x2 heat-matrix, forest plot of F/V/FxV with CIs, two-axis quadrant scatter, run drill-down drawer,
blinded view + Unblind button (ADMIN/REVIEWER), comments, and export CSV/JSON.
```

## 5) حلبة المقارنة A/B/C
```
Build /arena per §3.5 using compareManifolds-style logic but with live-editable manifold params (dead volume, tau, residual offset,
bubble prob). Overlay 20 sample pressure transients per design, bar chart of % within ±5%, carryover and bubbles, and a verdict banner
"Does C outperform B?" (the decisive comparator from the proposal §9). Run in the worker.
```

## 6) المكتبة، المسح، الجاهزية، التعلم
```
Build /library (CRUD tables + dialogs with Zod validation for perfusates, vessel conditions, manifolds, interventions, chip batches/chips),
/sweep (1–2 parameter Monte-Carlo heatmap, tornado sensitivity chart, simulation-based power curve for FxV vs replicates per arm),
/readiness (evidence table §17, prior art §11 with links, IP gate checklist §12, physician questions §15, ethics checklist §16,
milestone timeline + SAR budget ranges from Milestone table), and /learn (interactive Poiseuille r^4 slider, no-reflow explainer,
2x2 logic animation, guided tour). Then the Mission Control dashboard (/) per §3.1 with KPI tiles and readiness radar.
```

## 7) المصادقة والصلاحيات
```
Add Supabase Auth (magic link) with @supabase/ssr middleware; on first login upsert a User row; enforce roles from PLATFORM_SPEC §2
in Server Actions and hide UI accordingly. Add a "demo mode" that logs in as a VIEWER without email for presentations.
```

## 8) تقرير PDF + مساعد ذكي (اختياري)
```
Add "Generate report" on /experiments/[id]: a printable /report route styled like the proposal PDF (methods, preregistration hash,
2x2 results, two-axis verdicts, safety events, caveats + disclaimer) using @react-pdf/renderer or print CSS.
If ANTHROPIC_API_KEY is set, add an "Explain this run" button that sends the endpoints/events JSON to the Claude API
(model claude-sonnet-5-5) via a server route and streams a short Arabic/English explanation. Never send user personal data.
```

## 9) الاختبار والنشر
```
Write Playwright e2e: create 2x2 experiment → run → see results → export CSV; lab chaos mode triggers interlock.
Run vitest + playwright + tsc + lint, fix everything. Then prepare deployment to Vercel (env vars list in README).
```

---
### نصائح
- إذا Cursor خرب شي: اكتب له `Revert your last change and try a smaller step`.
- بعد كل خطوة سو commit في git، عشان تقدر ترجع لو صار شي.
- إذا غيّر أحد فيزياء المحرك، شغّل `npm run sim:check`، لازم يطلع ✅.
