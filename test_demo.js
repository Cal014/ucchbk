const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:3000');
  
  // Inject mock token so the frontend doesn't redirect to login
  await page.evaluate(() => {
    localStorage.setItem('token', 'dummy_token');
    localStorage.setItem('user', JSON.stringify({ id: 'dummy', role: 'patient', email: 'kel123@gmail.com' }));
  });
  
  // Reload and navigate directly to book-appointment
  await page.goto('http://localhost:3000/#book-appointment', { waitUntil: 'networkidle0' });
  
  console.log('Waiting for card-number input...');
  await page.waitForSelector('#card-number', { timeout: 10000 });
  
  console.log('Forcing payment section to show...');
  await page.evaluate(() => {
    document.getElementById('step-payment').style.opacity = '1';
    document.getElementById('step-payment').style.pointerEvents = 'auto';
    document.getElementById('card-form').classList.remove('hidden');
  });
  
  console.log('Testing Visa input...');
  await page.type('#card-number', '4111111111111111', { delay: 50 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'visa_test.png' });
  console.log('Visa screenshot saved to visa_test.png');
  
  console.log('Testing Mastercard input...');
  await page.evaluate(() => { document.getElementById('card-number').value = ''; });
  await page.type('#card-number', '5500000000000000', { delay: 50 });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'mastercard_test.png' });
  console.log('Mastercard screenshot saved to mastercard_test.png');
  
  await browser.close();
  console.log('Demo completed successfully.');
})();
