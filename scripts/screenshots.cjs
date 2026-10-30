const { chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
(async () => {
  const output = path.resolve(process.argv[2] || 'dist'); await fs.mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:'chromium',headless:true});
  const page = await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:8765/preview.html');
  await page.frameLocator('iframe').getByRole('button',{name:'The best ideas often begin with a small moment of attention.',exact:true}).waitFor();
  await page.screenshot({path:path.join(output,'text-marker-preview.png')});
  await page.locator('iframe').screenshot({path:path.join(output,'text-marker-popup.png')});
  await page.frameLocator('iframe').getByRole('tab',{name:'All pages'}).click();
  await page.frameLocator('iframe').getByRole('button',{name:'Delete all highlights',exact:true}).click();
  await page.locator('iframe').screenshot({path:path.join(output,'text-marker-delete-all.png')});
  await browser.close();
})();
