/**
 * Professional HTML→PDF Converter
 * Computer Workbooks Project - Beginner, Intermediate, Advanced
 * Uses Puppeteer for A4 print-quality PDF generation
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_DIR = path.resolve(__dirname);

const grades = [
  { id: 'part-1-beginner', output: 'part-1-beginner.pdf', label: 'الجزء الأول: مبتدئ', color: '#1565C0', minPages: 30 },
  { id: 'part-2-intermediate', output: 'part-2-intermediate.pdf', label: 'الجزء الثاني: متوسط', color: '#2E7D32', minPages: 30 },
  { id: 'part-3-advanced', output: 'part-3-advanced.pdf', label: 'الجزء الثالث: متقدم', color: '#4527A0', minPages: 30 },
];

// Count PDF pages by scanning the raw binary for page markers
function countPDFPages(pdfPath) {
  try {
    const buf = fs.readFileSync(pdfPath);
    const str = buf.toString('latin1');
    // Match /Type /Page (not /Pages) - this counts individual pages
    const m1 = str.match(/\/Type\s*\/Page(?!s)/g);
    if (m1) return m1.length;
    // Fallback: count stream objects (less accurate)
    const m2 = str.match(/endstream/g);
    return m2 ? Math.floor(m2.length / 2) : 0;
  } catch {
    return '?';
  }
}

async function convertGrade(grade, browser) {
  const htmlFile = path.join(BASE_DIR, grade.id, 'index.html');
  const pdfFile = path.join(BASE_DIR, grade.output);

  if (!fs.existsSync(htmlFile)) {
    return { grade: grade.label, status: 'missing', pages: 0 };
  }

  console.log(`\n  📖 جاري معالجة ${grade.label}...`);

  const page = await browser.newPage();

  try {
    // Set Arabic language
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ar,ar-SA;q=0.9' });

    // A4 viewport
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.5 });

    const url = 'file:///' + htmlFile.replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });

    // Wait for fonts and CSS to fully render
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1500));

    // Count <section class="page"> elements (expected pages)
    const sectionCount = await page.evaluate(() =>
      document.querySelectorAll('section.page').length
    );
    console.log(`     📋 عدد أقسام الصفحة في HTML: ${sectionCount}`);

    // Generate PDF
    await page.pdf({
      path: pdfFile,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      displayHeaderFooter: false,
    });

    await page.close();

    // Verify PDF
    const pdfPages = countPDFPages(pdfFile);
    const fileSizeKB = Math.round(fs.statSync(pdfFile).size / 1024);
    const meetsMin = (typeof pdfPages === 'number') ? pdfPages >= grade.minPages : false;

    console.log(`     ✅ PDF: ${pdfPages} صفحة | ${fileSizeKB} KB`);
    if (!meetsMin) {
      console.log(`     ⚠️  تحذير: الحد الأدنى ${grade.minPages} صفحة`);
    }

    return {
      grade: grade.label,
      id: grade.id,
      status: 'success',
      htmlSections: sectionCount,
      pdfPages,
      fileSizeKB,
      meetsMinimum: meetsMin,
      pdfPath: pdfFile,
    };
  } catch (err) {
    await page.close();
    console.error(`     ❌ خطأ: ${err.message}`);
    return { grade: grade.label, id: grade.id, status: 'error', error: err.message };
  }
}

async function main() {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║    محول دوسيات الحاسوب المدرسية إلى PDF         ║');
  console.log('║    إصدار احترافي - A4 جاهز للطباعة              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // Launch browser
  console.log('🚀 تشغيل المتصفح...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--lang=ar',
      '--font-render-hinting=none',
    ],
  });

  const results = [];

  try {
    for (const grade of grades) {
      const result = await convertGrade(grade, browser);
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  // ===== FINAL REPORT =====
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                 تقرير النتائج النهائي            ║');
  console.log('╚══════════════════════════════════════════════════╝');

  let allPassed = true;
  for (const r of results) {
    if (r.status === 'success') {
      const icon = r.meetsMinimum ? '✅' : '⚠️ ';
      if (!r.meetsMinimum) allPassed = false;
      console.log(`\n  ${icon} ${r.grade}`);
      console.log(`     أقسام HTML : ${r.htmlSections}`);
      console.log(`     صفحات PDF  : ${r.pdfPages}`);
      console.log(`     حجم الملف  : ${r.fileSizeKB} KB`);
      console.log(`     المسار     : ${r.pdfPath}`);
    } else if (r.status === 'missing') {
      allPassed = false;
      console.log(`\n  ❌ ${r.grade} - ملف HTML غير موجود`);
    } else {
      allPassed = false;
      console.log(`\n  ❌ ${r.grade} - ${r.error}`);
    }
  }

  console.log(`\n  ⏱  الوقت المستغرق: ${elapsed} ثانية`);
  console.log(allPassed
    ? '\n  ✅ جميع الدوسيات جاهزة للطباعة!\n'
    : '\n  ⚠️  بعض الدوسيات تحتاج إلى مراجعة\n');

  // Save JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    elapsedSeconds: parseFloat(elapsed),
    allMeetMinimum: allPassed,
    workbooks: results,
  };

  const reportPath = path.join(BASE_DIR, 'conversion-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`  📋 تقرير JSON: ${reportPath}\n`);

  return allPassed;
}

main().then(ok => process.exit(ok ? 0 : 1)).catch(e => {
  console.error('خطأ غير متوقع:', e);
  process.exit(1);
});
