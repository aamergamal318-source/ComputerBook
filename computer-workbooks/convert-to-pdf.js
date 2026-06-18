/**
 * محوّل دوسيات الحاسوب من HTML إلى PDF
 * Computer Workbook HTML → PDF Converter using Puppeteer
 *
 * الدوسيات المدعومة:
 *   part-1-beginner   → part-1-beginner.pdf
 *   part-2-intermediate → part-2-intermediate.pdf
 *   part-3-advanced   → part-3-advanced.pdf
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PARTS = [
  {
    folder: 'part-1-beginner',
    label: 'الجزء الأول: مبتدئ',
    outputName: 'part-1-beginner.pdf',
  },
  {
    folder: 'part-2-intermediate',
    label: 'الجزء الثاني: متوسط',
    outputName: 'part-2-intermediate.pdf',
  },
  {
    folder: 'part-3-advanced',
    label: 'الجزء الثالث: متقدم',
    outputName: 'part-3-advanced.pdf',
  },
];

async function convertToPDF(part) {
  const htmlPath = path.resolve(__dirname, part.folder, 'index.html');
  const pdfPath  = path.resolve(__dirname, part.folder, part.outputName);

  if (!fs.existsSync(htmlPath)) {
    console.error(`❌  ملف HTML غير موجود: ${htmlPath}`);
    return null;
  }

  console.log(`\n📄  جاري تحويل دوسية: ${part.label} ...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ar',
      '--disable-web-security',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();

    // A4 viewport
    await page.setViewport({ width: 794, height: 1123 });

    // Load HTML
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 90000,
    });

    // Wait for fonts to load (local woff2 files)
    await page.evaluate(() => {
      return new Promise(resolve => {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(resolve);
        } else {
          resolve();
        }
      });
    }).catch(() => {});

    // Verify critical fonts loaded
    const cairoLoaded = await page.evaluate(() =>
      document.fonts.check('700 16px Cairo')
    ).catch(() => false);
    if (!cairoLoaded) {
      console.warn(`   ⚠️  تحذير: خط Cairo لم يُحمَّل — تحقق من مسار assets/fonts/`);
    }

    // Extra settle time for layout
    await new Promise(r => setTimeout(r, 2000));

    // Count sections before generating PDF
    const pageCount = await page.evaluate(() =>
      document.querySelectorAll('.page').length
    );
    console.log(`   📑  عدد الصفحات المكتشفة في HTML: ${pageCount}`);

    const MIN_PAGES = 25, MAX_PAGES = 42;
    if (pageCount < MIN_PAGES || pageCount > MAX_PAGES) {
      console.warn(`   ⚠️  عدد الصفحات (${pageCount}) خارج النطاق المتوقع ${MIN_PAGES}–${MAX_PAGES}`);
    }

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    await browser.close();

    // Count PDF pages from binary
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfPageCount = countPDFPages(pdfBuffer);
    const fileSizeKB = Math.round(fs.statSync(pdfPath).size / 1024);

    console.log(`   ✅  PDF مُنشأ بنجاح: ${pdfPath}`);
    console.log(`   📖  عدد صفحات PDF: ${pdfPageCount}`);
    console.log(`   📦  حجم الملف: ${fileSizeKB} KB`);

    const MIN_PDF = 25, MAX_PDF = 42;
    return {
      label: part.label,
      outputName: part.outputName,
      htmlPages: pageCount,
      pdfPages: pdfPageCount,
      sizeKB: fileSizeKB,
      path: pdfPath,
      ok: typeof pdfPageCount === 'number' && pdfPageCount >= MIN_PDF && pdfPageCount <= MAX_PDF,
    };
  } catch (err) {
    await browser.close();
    console.error(`❌  خطأ في تحويل "${part.label}":`, err.message);
    return null;
  }
}

function countPDFPages(buffer) {
  const str = buffer.toString('latin1');
  const matches = str.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : '?';
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('    محوّل دوسيات الحاسوب  —  HTML ← PDF         ');
  console.log('══════════════════════════════════════════════════\n');

  const results = [];

  for (const part of PARTS) {
    const result = await convertToPDF(part);
    if (result) results.push(result);
  }

  // ── Summary ──────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('                   ملخص النتائج                   ');
  console.log('══════════════════════════════════════════════════');

  for (const r of results) {
    const status = r.ok ? '✅' : '⚠️ ';
    console.log(`${status}  ${r.label}`);
    console.log(`       ملف PDF:     ${r.outputName}`);
    console.log(`       صفحات HTML:  ${r.htmlPages}`);
    console.log(`       صفحات PDF:   ${r.pdfPages}${r.ok ? '' : '  ← تحقق!'}`);
    console.log(`       الحجم:       ${r.sizeKB} KB`);
    console.log(`       المسار:      ${r.path}\n`);
  }

  const allOk = results.length === 3 && results.every(r => r.ok);

  if (allOk) {
    console.log('✅  جميع الدوسيات الثلاث جاهزة للطباعة! (25–42 صفحة لكل دوسية)');
  } else {
    console.log('⚠️   بعض الدوسيات تحتاج مراجعة (راجع عدد الصفحات أعلاه)');
  }

  // Save JSON report
  const reportPath = path.resolve(__dirname, 'conversion-report.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), parts: results, allOk }, null, 2),
    'utf8'
  );
  console.log(`\n📋  تقرير التحويل محفوظ في: ${reportPath}`);
}

main().catch(err => {
  console.error('خطأ عام:', err);
  process.exit(1);
});
