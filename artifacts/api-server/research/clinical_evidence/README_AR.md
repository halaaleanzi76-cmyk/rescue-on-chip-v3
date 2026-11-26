# Rescue-on-Chip — حزمة مصادر الأدلة السريرية

**الإصدار:** 2026-11-23 — نموذج تأسيسي بحثي، ليس أداة قرار علاجي.

## محتويات الحزمة

| الملف | المحتوى |
|---|---|
| `clinical_evidence_sources.sqlite` | قاعدة SQLite بها **21 سجلًا لفهرس المصادر الرسمية** وجداول بحثية مجهزة (لا تحتوي بيانات مرضى أو نتائج تجارب فعلية عند التسليم) |
| `data_sources.csv` | نفس فهرس المصادر بصيغة CSV بما فيها القيود ونوع الوصول |
| `schema.sql` | تصميم الجداول وإجراءات الحماية البحثية |
| `sync_public_evidence.py` | مستورد Python يستدعي ClinicalTrials.gov وopenFDA لنشرة الدواء وملخص بلاغات الآثار الضارة |
| `test_sync.py` | اختبار برمجي محلي لا يختبر الشبكة أو دقة التنبؤ |
| `REPLIT_MASTER_COMMAND.txt` | الأمر الشامل لتطوير منصة Replit الموجودة |

## البدء في Replit

1. أضف الملفات إلى مساحة مشروعك الحالي واحفظ نقطة استعادة قبل أي تعديل.
2. احتفظ بملف `.sqlite` في مسار مستمر لتجنب فقده عند إعادة النشر؛ في الإنتاج انتقل إلى قاعدة PostgreSQL مُدارة إن لزم.
3. شغّل في طرفية المشروع:

```bash
python -m unittest -v
python sync_public_evidence.py --compound "aspirin" --max-studies 10 --max-labels 3 --max-signals 5
```

4. إذا نجح الوصول، افحص: `clinical_trials`, `clinical_outcomes`, `fda_labels`, `safety_signals`, `fetch_log`؛ تأكد من المصدر وتاريخه وحالة الاستيراد.
5. شغّل الأمر الكامل من `REPLIT_MASTER_COMMAND.txt` عبر Replit Agent. اطلب منه إثبات الجلب الحقيقي قبل اعتبار الربط ناجحًا.
6. يمكن الاستعلام عن قاعدة SQLite عبر Python:

```python
import sqlite3
c = sqlite3.connect('clinical_evidence_sources.sqlite')
print(c.execute('SELECT source_id, integration_state FROM source_catalog').fetchall())
print(c.execute('SELECT nct_id,study_title,has_posted_results FROM clinical_trials LIMIT 5').fetchall())
```

## قيود علمية أساسية

- **AACT** قاعدة التجارب السريرية الأكثر ملاءمة لبناء قاعدة بحثية كبيرة، وتحتاج التسجيل/بيانات الدخول لاستعمال قاعدة البيانات السحابية أو نسخها الكاملة.
- سجلات **ClinicalTrials.gov** المنشورة قد تحتوي نتائج مجمّعة أو تكون بلا نتائج منشورة؛ لا تُعدّ مصدرًا عامًا لصفوف المرضى الفردية ولا يصلح استعمالها مباشرة لتدريب نموذج تنبؤ بنتيجة مريض جديد.
- **FAERS** بلاغات تلقائية بها تحيزات وتكرارات؛ عدد البلاغات ليس معدل حدوث ولا دليل سببية أو سلامة/فعالية.
- **MIMIC-IV وVivli وYODA** تتطلب إجراءات وصول وتراخيص واتفاقيات استخدام، وأحيانًا مراجعة أخلاقية. لا تضع بياناتها المقيّدة في مستودع عام أو تطبيق منشور.
- **PubChem وChEMBL وToxCast** توفر معلومات جزيئية أو تجريبية مخبرية، ولا تثبت بحد ذاتها فعالية سريرية.
- النماذج يجب أن تكون محددة لمخرج علمي (*endpoint*) مع مجموعات تحقق خارجية مستقلة إن توفرت، وتقييم المعايرة والانحياز وعدم اليقين.
- منع تحويل تنبؤ نشاط E-selectin إلى نتيجة سريرية أو معامل تدفق تلقائيًا بدون علاقة علمية محققة.
- هذه الحزمة **لا تحتوي نموذج AI سريريًا مُدرّبًا أو معتمدًا**؛ يجب عدم عرضها كأنها تحتوي ذلك.

## روابط رسمية أساسية

- AACT: https://aact.ctti-clinicaltrials.org/landing
- ClinicalTrials.gov API: https://clinicaltrials.gov/data-api/api
- openFDA: https://open.fda.gov/apis/drug/
- DailyMed: https://dailymed.nlm.nih.gov/dailymed/app-support-web-services.cfm
- FDA Drugs@FDA: https://www.fda.gov/drugs/drug-approvals-and-databases/about-drugsfda
- ChEMBL: https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services
- PubChem: https://pubchem.ncbi.nlm.nih.gov/
- MIMIC-IV: https://physionet.org/content/mimiciv/3.1/
- Vivli: https://vivli.org/resources/requestdata/
- YODA: https://yoda.yale.edu/request/
- TRIPOD+AI: https://www.tripod-statement.org/
- PROBAST+AI: https://www.bmj.com/content/388/bmj-2024-082505
- SFDA MDS-G010: https://sfda.gov.sa/en/guide/guidance-artificial-intelligence-and-machine-learning-aiml-enabled-medical-devices-mds-%E2%80%93-g010

**ملاحظة:** المستورد مثال عملي محدود النطاق لا يستورد قواعد AACT كاملة ولا يُنشئ روابط سببية تلقائيًا. قد تحتاج تعديل حقول البحث والاستيراد إذا غيّرت الجهات واجهات API الخاصة بها. نجاح الشبكة لا يُعرف إلا من التشغيل الفعلي داخل Replit.
