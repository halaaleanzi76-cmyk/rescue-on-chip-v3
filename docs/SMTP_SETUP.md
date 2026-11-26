# ربط بريد خاص (Custom SMTP) بـ Supabase

بريد Supabase المجاني الجاهز فيه حد منخفض للرسائل بالساعة، وفي المشاريع الجديدة غالبًا ما يرسل إلا
لإيميلات أعضاء فريق المشروع. عشان أي مستخدم يقدر يسجّل، نربط Gmail كخادم بريد.

> **مهم:** كلمة مرور التطبيق اللي بتطلعها من Google سرّية. حطها في Supabase مباشرة ولا ترسلها في المحادثة.

## 1) طلّع كلمة مرور تطبيق من Google
1. التحقق بخطوتين لازم يكون مفعّل في حساب Google اللي بيرسل الرسائل (مثلًا halaaleanzi76@gmail.com):
   https://myaccount.google.com/signinoptions/twosv
2. افتح https://myaccount.google.com/apppasswords
3. اكتب اسم التطبيق `Rescue-on-Chip Supabase` واضغط **Create**.
4. انسخ الرمز اللي طلع (16 حرف) واحذف المسافات منه.

## 2) أدخل البيانات في Supabase
**Authentication → Emails → SMTP Settings**، فعّل **Enable custom SMTP**، وعبّي الحقول كذا:

| الحقل | القيمة |
|---|---|
| Sender email | halaaleanzi76@gmail.com (لازم يكون نفس حساب Google) |
| Sender name | Rescue-on-Chip |
| Host | smtp.gmail.com |
| Port | 587 |
| Username | halaaleanzi76@gmail.com |
| Password | كلمة مرور التطبيق اللي طلّعتها (16 حرف) |
| Minimum interval | 30 ثانية (اترك الافتراضي) |

اضغط **Save**.

## 3) حدود الإرسال
**Authentication → Rate Limits**: خلّ **Rate limit for sending emails** على 30 رسالة بالساعة أو أكثر.
(Gmail يسمح بحوالي 500 رسالة باليوم للحسابات العادية.)

## 4) قوالب الرسائل بالعربي والإنجليزي
**Authentication → Emails → Templates**:
- **Confirm signup**: الموضوع `تأكيد حسابك · Confirm your Rescue-on-Chip account`، والمحتوى انسخه من
  `supabase/email-templates/confirm-signup.html`
- **Reset password**: الموضوع `إعادة تعيين كلمة المرور · Reset your password`، والمحتوى من
  `supabase/email-templates/reset-password.html`

القوالب تستخدم `{{ .ConfirmationURL }}`، وهذا متوافق مع طريقة PKCE اللي تستخدمها المنصة
(الرابط يرجع على `/auth/callback`).

## 5) جرّب
1. من صفحة إنشاء حساب، سجّل بإيميل **ثاني ما هو عضو في فريق Supabase** (مثلًا إيميل جامعي أو شخصي ثاني).
2. لازم توصل رسالة التأكيد خلال دقيقة. شيّك بعد على مجلد الرسائل غير المرغوبة (Spam).
3. جرّب "نسيت كلمة المرور؟" بنفس الإيميل.

## مشاكل شائعة
| المشكلة | الحل |
|---|---|
| `535 Username and Password not accepted` | استخدم كلمة مرور التطبيق، مو كلمة مرور Gmail العادية، وتأكد إن التحقق بخطوتين مفعّل |
| الرسالة توصل على Spam | أول كم رسالة طبيعي. علّمها "ليست رسالة غير مرغوب فيها" |
| `Email rate limit exceeded` | ارفع الحد في Rate Limits أو انتظر ساعة |
| الرابط يقول "غير صالح" | افتح الرابط على نفس المتصفح اللي سجّلت منه (طريقة PKCE تحتاج كذا) |

لاحقًا لو صار للمنصة نطاق (دومين) خاص فيها، الأفضل تنتقل لخدمة مثل Resend أو Amazon SES مع إعداد SPF وDKIM.
