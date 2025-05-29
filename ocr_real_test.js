const fs = require('fs');
const path = require('path');
const https = require('https');
const { chromium } = require('playwright');

(async () => {
  const serverUrl = 'http://localhost:8000/';
  const imgPath = 'eng_sample.png';
  const imgUrl = 'https://tesseract.projectnaptha.com/img/eng_bw.png'; // known text image
  const expectedPhrase = 'QUICK BROWN FOX';

  // Ensure sample image exists
  if (!fs.existsSync(imgPath)) {
    console.log('[setup] Downloading English sample image...');
    await new Promise((resolve, reject) => {
      https.get(imgUrl, res => {
        if (res.statusCode !== 200) return reject(new Error(`Failed to download image (${res.statusCode})`));
        const file = fs.createWriteStream(imgPath);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
  }

  // Prepare dummy wrong-type file
  const txtPath = 'dummy.txt';
  fs.writeFileSync(txtPath, 'dummy');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ------------- Helper utilities -------------
  async function waitWorkerReady() {
    await page.waitForFunction(() => !document.getElementById('uploadBtn').disabled, null, { timeout: 240000 });
  }

  async function dragAndDropFile(selector, filePath, mime) {
    const abs = path.resolve(filePath);
    const buffer = await fs.promises.readFile(abs);
    const data = buffer.toString('base64');
    await page.evaluate(async ({ sel, name, mimeType, b64 }) => {
      function b64ToUint8Array(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }
      const dropArea = document.querySelector(sel);
      const file = new File([b64ToUint8Array(b64)], name, { type: mimeType });
      const dt = new DataTransfer();
      dt.items.add(file);
      const event = new DragEvent('drop', { dataTransfer: dt });
      dropArea.dispatchEvent(event);
    }, { sel: selector, name: path.basename(abs), mimeType: mime, b64: data });
  }

  // ------------- Test 1: Drag & Drop with real OCR -------------
  console.log('\n[Test 1] Drag & Drop upload with real Tesseract');
  await page.goto(serverUrl, { waitUntil: 'domcontentloaded' });
  await waitWorkerReady();
  console.log('Worker ready -> dragging file');
  await dragAndDropFile('#dropArea', imgPath, 'image/png');
  console.log('File dropped, waiting for result ...');
  await page.waitForSelector('#resultContainer:not([hidden])', { timeout: 300000 });
  const text = await page.$eval('#resultText', el => el.textContent);
  const passOCR = text.toUpperCase().includes(expectedPhrase);
  console.log(`OCR contains phrase "${expectedPhrase}" ? ${passOCR}`);

  // ------------- Test 2: Wrong file type -------------
  console.log('\n[Test 2] Upload wrong file type');
  let alertMessage = null;
  page.once('dialog', dlg => { alertMessage = dlg.message(); dlg.dismiss(); });
  const fileInput = await page.$('#fileInput');
  await fileInput.setInputFiles(txtPath);
  await page.waitForTimeout(1000);
  console.log('Alert triggered?', !!alertMessage);

  // ------------- Test 3: Network failure during model load -------------
  console.log('\n[Test 3] Model download failure');
  const failPage = await context.newPage();
  await failPage.route(/.*\.traineddata(\.gz)?$/, route => route.abort());
  await failPage.goto(serverUrl, { waitUntil: 'domcontentloaded' });
  // Wait for failure status text
  const failureDetected = await failPage.waitForFunction(() => document.getElementById('statusText').textContent.includes('失败'), null, { timeout: 120000 }).then(()=>true).catch(()=>false);
  console.log('Initialization failure displayed?', failureDetected);

  await browser.close();
})();