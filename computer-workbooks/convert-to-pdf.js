/**
 * HTML to PDF Converter using Puppeteer
 * Converts all three grade workbooks to A4 PDF files
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const grades = [
  { name: 'grade-7', label: 'الصف السابع' },
  { name: 'grade-8', label: 'الصف الثامن' },
  { name: 'grade-9', label: 'الصف التاسع' },
];

async function convertToPDF(grade) {
  const htmlPath = path.resolve(__dirname, grade.name, 'index.html');
  const pdfPath = path.resolve(__dirname, grade.name, `${grade.name}.pdf`);

  if (!fs.existsSync(htmlPath)) {
    console.error(`❌ ملف HTML غير موجود: ${htmlPath}`);
    return null;
  }

  console.log(`\n📄 جاري تحويل دوسية ${grade.label}...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ar'],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to A4 dimensions
    await page.setViewport({ width: 794, height: 1123 });

    // Load HTML file
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Wait for fonts and layout to settle
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
      preferCSSPageSize: true,
    });

    await browser.close();

    // Count pages
    const pageCount = countPDFPages(fs.readFileSync(pdfPath));
    const fileSizeKB = Math.round(fs.statSync(pdfPath).size / 1024);

    console.log(`✅ تم إنشاء: ${pdfPath}`);
    console.log(`   📖 عدد الصفحات: ${pageCount}`);
    console.log(`   📦 حجم الملف: ${fileSizeKB} KB`);

    return { grade: grade.label, pages: pageCount, size: fileSizeKB, path: pdfPath };
  } catch (err) {
    await browser.close();
    console.error(`❌ خطأ في تحويل ${grade.label}:`, err.message);
    return null;
  }
}

function countPDFPages(buffer) {
  // Count occurrences of /Type /Page in PDF binary
  const str = buffer.toString('latin1');
  const matches = str.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : '?';
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('   محول دوسيات الحاسوب من HTML إلى PDF       ');
  console.log('═══════════════════════════════════════════════');

  const results = [];

  for (const grade of grades) {
    const result = await convertToPDF(grade);
    if (result) results.push(result);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('                 ملخص النتائج                  ');
  console.log('═══════════════════════════════════════════════');
  for (const r of results) {
    const status = r.pages >= 25 ? '✅' : '⚠️';
    console.log(`${status} ${r.grade}: ${r.pages} صفحة | ${r.size} KB`);
    console.log(`   ${r.path}`);
  }

  const allGood = results.every(r => r.pages >= 25);
  if (allGood) {
    console.log('\n✅ جميع الدوسيات جاهزة للطباعة! (25+ صفحة لكل دوسية)');
  } else {
    console.log('\n⚠️  بعض الدوسيات تحتاج إلى صفحات إضافية (أقل من 25 صفحة)');
  }

  // Save report
  const report = {
    generatedAt: new Date().toISOString(),
    workbooks: results,
    allMeetMinimum: allGood,
  };
  fs.writeFileSync(
    path.resolve(__dirname, 'conversion-report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );
  console.log('\n📋 تم حفظ تقرير التحويل في: conversion-report.json');
}

main().catch(err => {
  console.error('خطأ عام:', err);
  process.exit(1);
});
