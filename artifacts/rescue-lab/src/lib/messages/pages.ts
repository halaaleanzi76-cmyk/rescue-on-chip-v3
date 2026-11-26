/** Compare, Run history and Model & methods pages. */
import { defineMessages } from './define';

export const pages = defineMessages({
  // compare
  'cmp.title': 'Comparison workspace', 'cmp.typeAria': 'Comparison type',
  'cmp.twoTopologies': 'Two topologies · same run', 'cmp.twoRuns': 'Two saved runs',
  'cmp.runA': 'Run A', 'cmp.runB': 'Run B', 'cmp.topologyBoth': 'Topology (both)',
  'cmp.empty': 'No saved runs yet. Save an experiment in the 3D Laboratory to compare.',
  'cmp.q.p': 'p', 'cmp.q.Q': 'Q', 'cmp.q.u': 'ū', 'cmp.q.carry': 'carryover',
  'cmp.chartPressure': 'inlet pressure · Pa · A solid / B dashed', 'cmp.chartCarryover': 'carryover · %',
  'cmp.footnote': "Both viewports share one playback clock and one colour scale (union of both runs' Python extrema). Differences reflect modelled topologies and parameters only; they are not evidence that any method is superior or that any treatment works.",

  // runs
  'runs.kicker': 'shared research workspace', 'runs.title': 'Reproducible run history',
  'runs.filter': 'Filter by name, id or fingerprint', 'runs.count': '{shown} of {total} runs',
  'runs.noMatch': 'No runs match this filter', 'runs.none': 'No runs recorded yet', 'runs.openLab': 'Open the 3D laboratory',
  'runs.col.name': 'Name', 'runs.col.created': 'Created', 'runs.col.seed': 'Seed', 'runs.col.n': 'n/arm',
  'runs.col.peak': 'Equalized peak (%)', 'runs.col.goal': 'Pressure goal', 'runs.col.fp': 'Fingerprint',
  'runs.goalMet': '≤5 % (sim.)', 'runs.goalExceeds': 'exceeds',
  'runs.open3d': 'Open in 3D lab', 'runs.analysis': 'Analysis',
  'runs.footnote': 'Opening a run loads its stored results and configuration into the 3D laboratory for editing and re-running. Identical config + model version yields the identical fingerprint.',

  // model
  'model.unavailable': 'Model unavailable', 'model.kicker': 'model v{v} · {status}',
  'model.lead': 'A virtual bench for honest comparison of switching topologies, not a claim about tissue.',
  'model.sourceNote': 'Source dated {date}. The proposal is concept / pre-prototype and contains no empirical data or calibrated equations. Every geometric, controller and biological default is an assumption, except the provisional ≤5 % peak inlet pressure and ≤5 % carryover goals and the illustrative n=6 per arm.',
  'model.download': 'Download source document',
  'model.eqKicker': 'numerical methods', 'model.eqTitle': 'Equations',
  'model.asKicker': 'read before interpreting', 'model.asTitle': 'Assumptions',
  'model.limKicker': 'what results do not mean', 'model.limTitle': 'Interpretation limits',
  'model.lim1': 'Three methods share τ defaults with independently editable waits; comparisons are hypothetical, not proof of superiority.',
  'model.lim2': 'Permeability is user-prescribed; barrier transport is not a damage prediction.',
  'model.lim3': 'Planned barrier margin is a planning value only; no barrier pass/fail or efficacy is assessed.',
  'model.lim4': 'Rescue fraction is an assumed geometric reversal, not therapeutic efficacy or BBB preservation.',
  'model.lim5': 'Confidence intervals reflect virtual radius variability only. No viability is modelled.',
  'model.defaultsTitle': 'Default configuration',
}, {
  'cmp.title': 'مساحة المقارنة', 'cmp.typeAria': 'نوع المقارنة',
  'cmp.twoTopologies': 'طريقتان · نفس التجربة', 'cmp.twoRuns': 'تجربتان محفوظتان',
  'cmp.runA': 'التجربة A', 'cmp.runB': 'التجربة B', 'cmp.topologyBoth': 'الطريقة (للاثنين)',
  'cmp.empty': 'لا توجد تجارب محفوظة بعد. احفظ تجربة في المختبر ثلاثي الأبعاد عشان تقارن.',
  'cmp.q.p': 'p', 'cmp.q.Q': 'Q', 'cmp.q.u': 'ū', 'cmp.q.carry': 'البقايا',
  'cmp.chartPressure': 'ضغط المدخل · Pa · A متصل / B متقطع', 'cmp.chartCarryover': 'نسبة البقايا · %',
  'cmp.footnote': 'نافذتا العرض تشتركان في ساعة تشغيل واحدة ومقياس ألوان واحد (يجمع القيم القصوى من Python للتجربتين). الفروق تعكس الطرق والمعاملات المنمذجة فقط، وليست دليلًا على تفوّق أي طريقة أو على فعالية أي علاج.',

  'runs.kicker': 'مساحة بحث مشتركة', 'runs.title': 'سجل تجارب قابل لإعادة الإنتاج',
  'runs.filter': 'تصفية بالاسم أو المعرّف أو البصمة', 'runs.count': '{shown} من {total} تجربة',
  'runs.noMatch': 'لا توجد تجارب تطابق هذا البحث', 'runs.none': 'لا توجد تجارب مسجّلة بعد', 'runs.openLab': 'فتح المختبر ثلاثي الأبعاد',
  'runs.col.name': 'الاسم', 'runs.col.created': 'تاريخ الإنشاء', 'runs.col.seed': 'البذرة', 'runs.col.n': 'n/ذراع',
  'runs.col.peak': 'ذروة معادلة الضغط (%)', 'runs.col.goal': 'هدف الضغط', 'runs.col.fp': 'البصمة',
  'runs.goalMet': '≤5 % (محاكاة)', 'runs.goalExceeds': 'يتجاوز',
  'runs.open3d': 'فتح في المختبر', 'runs.analysis': 'التحليل',
  'runs.footnote': 'فتح أي تجربة يحمّل نتائجها وإعداداتها المخزّنة في المختبر ثلاثي الأبعاد للتعديل وإعادة التشغيل. نفس الإعدادات ونفس نسخة النموذج تعطي نفس البصمة.',

  'model.unavailable': 'النموذج غير متاح', 'model.kicker': 'النموذج v{v} · {status}',
  'model.lead': 'منصة افتراضية لمقارنة نزيهة بين طرق التبديل، وليست ادعاءً عن الأنسجة.',
  'model.sourceNote': 'تاريخ المصدر {date}. المقترح في مرحلة المفهوم / ما قبل النموذج الأولي، وما فيه بيانات تجريبية ولا معادلات معايَرة. كل القيم الافتراضية الهندسية وقيم التحكم والقيم البيولوجية افتراضات، ما عدا الأهداف المبدئية (≤5 % لذروة ضغط المدخل و ≤5 % للبقايا) والقيمة التوضيحية n=6 لكل ذراع.',
  'model.download': 'تنزيل المستند المصدر',
  'model.eqKicker': 'الطرق العددية', 'model.eqTitle': 'المعادلات',
  'model.asKicker': 'اقرأها قبل تفسير النتائج', 'model.asTitle': 'الافتراضات',
  'model.limKicker': 'ما لا تعنيه النتائج', 'model.limTitle': 'حدود التفسير',
  'model.lim1': 'الطرق الثلاث تشترك في قيم τ الافتراضية مع أوقات انتظار قابلة للتعديل بشكل مستقل، فالمقارنات افتراضية وليست دليلًا على التفوّق.',
  'model.lim2': 'النفاذية يحددها المستخدم، وانتقال المواد عبر الحاجز ليس تنبؤًا بالضرر.',
  'model.lim3': 'هامش الحاجز المخطط قيمة للتخطيط فقط، ولا يُقيَّم نجاح أو فشل الحاجز ولا أي فعالية.',
  'model.lim4': 'نسبة الإنقاذ عكسٌ هندسي مفترض، وليست فعالية علاجية ولا حفاظًا على الحاجز الدموي الدماغي.',
  'model.lim5': 'فترات الثقة تعكس تباين نصف القطر الافتراضي فقط، ولا تُنمذج حيوية الخلايا.',
  'model.defaultsTitle': 'الإعدادات الافتراضية',
});
