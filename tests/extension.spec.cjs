const { test, expect, chromium } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const http = require('node:http');
let context, worker, base, server, profile, extensionId;
const fixture = `<!doctype html><title>The art of paying attention</title><style>body{font:22px/1.8 Georgia;max-width:700px;margin:70px auto}p{margin:32px 0}</style><h1>The art of paying attention</h1><p id="mixed">A quiet moment can <em>change the way</em> we see the world.</p><p id="repeat">Read slowly. Read slowly.</p><p id="safe">A page worth remembering.</p><div id="late"></div><input value="private field"><div contenteditable>private editor</div>`;
test.beforeAll(async () => {
  server = http.createServer((req,res) => { res.setHeader('Content-Type','text/html'); res.end(fixture); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  profile = await fs.mkdtemp(path.join(os.tmpdir(),'marker-test-'));
  const extension = path.resolve(__dirname,'..');
  context = await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
});
test.afterAll(async () => { await context?.close(); server?.close(); await fs.rm(profile,{recursive:true,force:true}); });
test.beforeEach(async () => { await worker.evaluate(() => chrome.storage.local.clear()); });
async function open(suffix='/article') { const page = await context.newPage(); await page.goto(base + suffix); await expect(page.locator('[data-text-marker-ui]')).toBeAttached(); return page; }
async function select(page, selector, start=0, end) {
  await page.locator(selector).evaluate((element, bounds) => {
    const range = document.createRange(); range.selectNodeContents(element);
    if (bounds.start || bounds.end !== undefined) { range.setStart(element.firstChild,bounds.start); range.setEnd(element.firstChild,bounds.end); }
    getSelection().removeAllRanges(); getSelection().addRange(range);
    element.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
  },{start,end});
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function mark(page, selector, color='yellow', start=0, end) { await select(page,selector,start,end); await page.getByRole('button',{name:`Highlight preset ${['yellow','green','blue','pink','orange'].indexOf(color)+1}`,exact:true}).click(); await expect(page.getByRole('dialog')).toBeHidden(); }
async function data() { return worker.evaluate(async () => (await chrome.storage.local.get('text-marker-highlights'))['text-marker-highlights'] || {}); }
async function popup() { const p = await context.newPage(); await p.goto(`chrome-extension://${extensionId}/popup.html`); return p; }
test('cross-element selection preserves markup, reload restores, deletion syncs', async () => {
  const page = await open(); const before = await page.locator('#mixed').textContent();
  await mark(page,'#mixed');
  await expect(page.locator('#mixed [data-text-marker-id]')).toHaveCount(3);
  await expect(page.locator('#mixed em')).toHaveText('change the way');
  expect(Object.values(await data())[0][0].text).toBe(before);
  await page.reload();
  await expect(page.locator('#mixed [data-text-marker-id]')).toHaveCount(3);
  await page.locator('#mixed [data-text-marker-id]').first().click();
  await page.getByRole('button',{name:'Remove',exact:true}).click();
  await expect(page.locator('#mixed [data-text-marker-id]')).toHaveCount(0);
  await expect(page.locator('#mixed em')).toHaveText('change the way');
  await expect.poll(data).toEqual({});
  await page.close();
});
test('duplicate quotes restore the chosen occurrence and hash links share records', async () => {
  const page = await open('/repeated#one'); await mark(page,'#repeat','blue',13,25);
  await page.goto(base + '/repeated#two'); await page.reload();
  await expect(page.locator('#repeat [data-text-marker-id]')).toHaveCount(1);
  const offset = await page.locator('#repeat').evaluate(el => el.firstChild.textContent.length);
  expect(offset).toBe(13); expect(Object.keys(await data())).toEqual([base + '/repeated']);
  await page.close();
});
test('legacy records, dynamic content and live removal',async () => {
  const url = base + '/old#legacy';
  await worker.evaluate(async url => chrome.storage.local.set({'text-marker-highlights':{[url]:[{id:'legacy',text:'A page worth remembering.',color:'green',timestamp:1,xpath:'/html/body/span[1]'}]}}),url);
  const page = await open('/old');
  await expect(page.locator('#safe [data-text-marker-id]')).toHaveCount(1);
  await page.locator('#safe').evaluate(el => el.remove());
  await page.locator('#late').evaluate(el => el.innerHTML='<p>A page worth remembering.</p>');
  await expect(page.locator('#late [data-text-marker-id]')).toHaveCount(1);
  await worker.evaluate(() => chrome.storage.local.set({'text-marker-highlights':{}}));
  await expect(page.locator('[data-text-marker-id]')).toHaveCount(0);
  await page.close();
});
test('concurrent writes from different pages retain both highlights',async () => {
  const a = await open('/a'), b = await open('/b');
  await Promise.all([mark(a,'#safe'),mark(b,'#safe','pink')]);
  expect(Object.keys(await data()).sort()).toEqual([base+'/a',base+'/b']);
  await a.close(); await b.close();
});
test('SPA navigation changes the highlighted record set',async () => {
  const page = await open('/spa'); await mark(page,'#safe');
  await page.evaluate(() => history.pushState({},'', '/other'));
  await expect(page.locator('[data-text-marker-id]')).toHaveCount(0);
  await page.evaluate(() => history.back());
  await expect(page.locator('[data-text-marker-id]')).toHaveCount(1);
  await page.close();
});
test('editable fields do not show the selection picker',async () => {
  const page = await open();
  await page.locator('[contenteditable]').evaluate(el => { const r=document.createRange();r.selectNodeContents(el);getSelection().removeAllRanges();getSelection().addRange(r);el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); });
  await expect(page.getByRole('dialog')).toBeHidden(); await page.close();
});
test('popup searches safely, exports JSON and removes records',async () => {
  const page = await open(); await mark(page,'#safe');
  const p = await popup(); await p.getByRole('tab',{name:'All pages'}).click();
  await expect(p.locator('.card')).toHaveCount(1);
  await p.getByRole('searchbox').fill('missing'); await expect(p.getByText('No matching thoughts')).toBeVisible();
  await p.getByRole('searchbox').fill('worth'); await expect(p.locator('.card')).toHaveCount(1);
  const downloadPromise = p.waitForEvent('download'); await p.getByRole('button',{name:'Export all highlights'}).click();
  const download = await downloadPromise; expect(download.suggestedFilename()).toMatch(/^text-marker-.*\.json$/);
  const exported = JSON.parse(await fs.readFile(await download.path(),'utf8')); expect(exported.highlights).toHaveLength(1);
  await p.getByRole('button',{name:/Remove highlight:/}).click();
  await expect(p.locator('.card')).toHaveCount(0); await expect(page.locator('[data-text-marker-id]')).toHaveCount(0);
  await p.close(); await page.close();
});
test('popup treats stored text as text, and legacy IDs do not enter HTML',async () => {
  await worker.evaluate(async url => chrome.storage.local.set({'text-marker-highlights':{[url]:[{id:'" onmouseover="alert(1)',text:'<img src=x onerror=alert(1)>',color:'yellow'}]}}),base+'/malicious');
  const p = await popup(); await p.getByRole('tab',{name:'All pages'}).click();
  await expect(p.locator('.quote')).toHaveText('<img src=x onerror=alert(1)>'); await expect(p.locator('.card img')).toHaveCount(0);
  await p.close();
});
test('picker stays inside the viewport and keyboard selection works',async () => {
  const page = await open(); await page.setViewportSize({width:800,height:450});
  await select(page,'#safe'); const box = await page.getByRole('dialog').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y+box.height).toBeLessThanOrEqual(450);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden(); await page.close();
});

test('copies selected text and saved passages to the clipboard',async () => {
  const page = await open('/copy');
  await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
  await select(page,'#safe'); await page.getByRole('button',{name:'Copy text',exact:true}).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('A page worth remembering.');
  await page.getByRole('button',{name:'Highlight preset 1',exact:true}).click();
  const p = await popup();
  await p.getByRole('tab',{name:'All pages'}).click();
  await p.getByRole('button',{name:/Copy highlight:/}).click();
  await expect(p.getByRole('status')).toHaveText('Copied to clipboard.');
  await page.bringToFront();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('A page worth remembering.');
  await p.close(); await page.close();
});

test('delete all requires confirmation, respects cancellation, and clears every open page',async () => {
  const a=await open('/clear-a'), b=await open('/clear-b');
  await mark(a,'#safe'); await mark(b,'#safe','green');
  const p=await popup(); await p.getByRole('tab',{name:'All pages'}).click();
  await p.getByRole('button',{name:'Delete all highlights',exact:true}).click();
  await expect(p.locator('#confirmMessage')).toContainText('Delete all 2 highlights from every page?');
  expect(Object.keys(await data())).toHaveLength(2);
  await p.getByRole('button',{name:'Keep them',exact:true}).click();
  await expect(p.locator('#confirm')).toBeHidden();
  await expect(a.locator('[data-text-marker-id]')).toHaveCount(1);
  await expect(b.locator('[data-text-marker-id]')).toHaveCount(1);
  await p.getByRole('button',{name:'Delete all highlights',exact:true}).click();
  await p.locator('#confirmClear').click();
  await expect.poll(data).toEqual({});
  await expect(a.locator('[data-text-marker-id]')).toHaveCount(0);
  await expect(b.locator('[data-text-marker-id]')).toHaveCount(0);
  await expect(p.locator('.card')).toHaveCount(0);
  await expect(p.locator('#clearAll')).toBeHidden();
  await expect(p.getByRole('status')).toHaveText('All highlights deleted from every page.');
  await p.close(); await a.close(); await b.close();
});

test('custom color persists through reload, remains readable, and appears in the popup',async () => {
  const page=await open('/custom');
  await select(page,'#safe');
  await page.getByLabel('Custom highlight color',{exact:true}).fill('#31205f');
  await page.getByRole('button',{name:'Apply custom highlight color',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(Object.values(await data())[0][0].color).toBe('#31205f');
  await expect(page.locator('#safe [data-text-marker-id]')).toHaveCSS('background-color','rgb(49, 32, 95)');
  await expect(page.locator('#safe [data-text-marker-id]')).toHaveCSS('color','rgb(255, 255, 255)');
  await page.reload();
  await expect(page.locator('#safe [data-text-marker-id]')).toHaveCSS('background-color','rgb(49, 32, 95)');
  const p=await popup(); await p.getByRole('tab',{name:'All pages'}).click();
  await expect(p.locator('.color-dot')).toHaveCSS('background-color','rgb(49, 32, 95)');
  const rejected=await p.evaluate(async url => chrome.runtime.sendMessage({type:'marker:mutate',operation:'add',url,item:{id:'bad',text:'bad',color:'url(https://invalid.test/)'}}),base+'/custom');
  expect(rejected.ok).toBe(false);
  expect(Object.values(await data())[0]).toHaveLength(1);
  await p.close(); await page.close();
});

test('color settings save a live palette, preserve old marks, persist, and reset',async () => {
  const page=await open('/palette-settings'); await mark(page,'#safe');
  const p=await popup();
  const opened=context.waitForEvent('page'); await p.getByRole('button',{name:'Color settings',exact:true}).click();
  const settings=await opened; await settings.waitForURL(`chrome-extension://${extensionId}/settings.html`);
  await expect(settings.getByLabel('Preset color 1',{exact:true})).toHaveValue('#ffe58a');
  await settings.getByLabel('Preset color 1',{exact:true}).fill('#31205f');
  await settings.getByRole('button',{name:'Save colors',exact:true}).click();
  await expect(settings.getByRole('status')).toContainText('Colors saved');
  await select(page,'#mixed');
  await expect(page.getByRole('button',{name:'Highlight preset 1',exact:true})).toHaveCSS('background-color','rgb(49, 32, 95)');
  await page.getByRole('button',{name:'Highlight preset 1',exact:true}).click();
  await expect(page.locator('#safe [data-text-marker-id]')).toHaveCSS('background-color','rgb(255, 229, 138)');
  await expect(page.locator('#mixed [data-text-marker-id]').first()).toHaveCSS('background-color','rgb(49, 32, 95)');
  await settings.reload(); await expect(settings.getByLabel('Preset color 1',{exact:true})).toHaveValue('#31205f');
  await p.getByRole('tab',{name:'All pages'}).click();
  await p.getByRole('button',{name:'Delete all highlights',exact:true}).click(); await p.locator('#confirmClear').click();
  await expect.poll(data).toEqual({});
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('text-marker-palette'))['text-marker-palette'].yellow)).toBe('#31205f');
  await settings.getByRole('button',{name:'Restore defaults',exact:true}).click();
  await expect(settings.getByLabel('Preset color 1',{exact:true})).toHaveValue('#ffe58a');
  await settings.getByRole('button',{name:'Save colors',exact:true}).click();
  await expect(settings.getByRole('status')).toContainText('Colors saved');
  await select(page,'#mixed');
  await expect(page.getByRole('button',{name:'Highlight preset 1',exact:true})).toHaveCSS('background-color','rgb(255, 229, 138)');
  await p.close();await settings.close();await page.close();
});
