const fs = require('fs');
const https = require('https');
const { chromium } = require('playwright');

(async () => {
  const serverUrl = 'http://localhost:8000/';
  const imgPath = 'sample.png';
  const imgUrl = 'https://tesseract.projectnaptha.com/img/eng_bw.png';

  // Download sample image if not present
  if (!fs.existsSync(imgPath)) {
    console.log(`[setup] Downloading sample image to ${imgPath} ...`);
    await new Promise((resolve, reject) => {
      https.get(imgUrl, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`Failed to get image, status ${res.statusCode}`));
        const file = fs.createWriteStream(imgPath);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  }

  console.log('[test] Launching headless Chromium ...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- Mock Tesseract.js to avoid heavy downloads ---
  await page.route(/.*tesseract.*\.js$/, async route => {
    console.log('[mock] Intercepted Tesseract.js, serving stub');
    const stub = `window.Tesseract = {\n  createWorker: async () => ({\n    recognize: async () => ({ data: { text: 'MOCK OCR RESULT' } })\n  })\n};`;
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: stub });
  });

  console.log(`[test] Navigating to ${serverUrl}`);
  await page.goto(serverUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait until upload button is enabled (worker ready)
  await page.waitForFunction(() => !document.getElementById('uploadBtn').disabled, null, { timeout: 120000 });
  console.log('[test] OCR worker initialized and upload button enabled');

  // ---- Test via button click (file input) ----
  const fileInput = await page.$('#fileInput');
  await fileInput.setInputFiles(imgPath);
  console.log('[test] Image file selected via file input');

  // Wait for progress bar to advance and finally result to appear
  await page.waitForSelector('#resultContainer:not([hidden])', { timeout: 60000 });
  console.log('[test] OCR result container is visible');

  const resultText = await page.$eval('#resultText', el => el.textContent.trim());
  console.log(`[test] OCR result length: ${resultText.length} characters`);

  // Copy button
  await page.click('#copyBtn');
  console.log('[test] Copy button clicked (clipboard API may be restricted in headless)');

  // Download button
  const [ download ] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadBtn')
  ]);
  console.log(`[test] Download triggered with suggested filename: ${download.suggestedFilename()}`);

  await browser.close();
  console.log('[test] Completed successfully');
})();