# computer-workbooks-pro

ثلاث دوسيات حاسوب مدرسية متدرجة حسب المستوى، وليست حسب الصف:

- الجزء الأول: مبتدئ
- الجزء الثاني: متوسط
- الجزء الثالث: متقدم

كل دوسية تحتوي 30 صفحة A4 عمودي، RTL عربي، جاهزة للطباعة والتوزيع على الطلاب.

## الملفات النهائية

- `part-1-beginner.pdf`
- `part-2-intermediate.pdf`
- `part-3-advanced.pdf`

## ملفات HTML

- `part-1-beginner/index.html`
- `part-2-intermediate/index.html`
- `part-3-advanced/index.html`

## الشعارات

تم حفظ شعارات البرامج محليا داخل `assets/logos` واستخدامها داخل الغلاف والدروس عند ذكر البرنامج المناسب:

- Windows
- Microsoft Word
- Microsoft Excel
- Microsoft PowerPoint
- Google Docs
- Google Sheets
- Google Slides
- Google Forms
- Google Drive
- Gmail
- Google Calendar
- OpenAI / AI

مصادر الشعارات المستخدمة: Iconify API، ومجموعة VSCode Icons، وSimple Icons CDN للشعارات الملونة التي لم تكن متاحة بنفس الشكل في المجموعة الأولى.

## توليد الملفات

```bash
node generate-workbooks.js
node convert-to-pdf.js
```

## ملاحظات للطباعة

النسخة الحالية ملونة مثل التصميم الأصلي، مع صفحات A4 عمودية وهوامش مناسبة للطباعة على الجهتين. الشعارات محفوظة محليا حتى تظهر عند فتح الملفات بدون إنترنت.
