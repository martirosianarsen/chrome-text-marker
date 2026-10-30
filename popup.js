'use strict';
const { KEY, COLORS, pageKey, entries } = TextMarker;
const $ = id => document.getElementById(id);
let saved = [], url = '', tabId, all = false, pendingClear = null;
function status(message) { $('status').textContent = message; $('status').hidden = !message; }
const onPage = item => { try { return pageKey(item.pageUrl) === url; } catch { return false; } };
function render() {
  const local = saved.filter(onPage), query = $('search').value.trim().toLocaleLowerCase();
  $('allCount').textContent = saved.length; $('pageCount').textContent = local.length;
  $('clearPage').hidden = all || !local.length;
  $('clearAll').hidden = !all || !saved.length;
  $('export').disabled = !saved.length;
  $('scopeLabel').textContent = all ? 'YOUR SAVED COLLECTION' : 'SAVED ON THIS PAGE';
  $('list').replaceChildren();
  const visible = (all ? saved : local).filter(item => `${item.text} ${item.title || ''} ${item.pageUrl}`.toLocaleLowerCase().includes(query)).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));
  if (!visible.length) {
    const empty = document.createElement('div'); empty.className = 'empty';
    const icon = document.createElement('span'); icon.textContent = '“';
    const title = document.createElement('p'); title.textContent = query ? 'No matching thoughts' : 'Your next idea starts here';
    const hint = document.createElement('small'); hint.textContent = query ? 'Try another word or switch to All pages.' : 'Select some text on a webpage to save it.';
    empty.append(icon,title,hint); $('list').append(empty);
  }
  for (const item of visible) {
    const card = document.createElement('article'); card.className = 'card';
    const dot = document.createElement('span'); dot.className = 'color-dot'; dot.style.background = COLORS[item.color];
    const content = document.createElement('div'); content.className = 'card-content';
    const quote = document.createElement('button'); quote.className = 'quote'; quote.textContent = item.text; quote.title = 'Go to highlight';
    quote.onclick = () => focus(item);
    const meta = document.createElement('div'); meta.className = 'card-meta';
    const site = document.createElement('span');
    try { site.textContent = new URL(item.pageUrl).hostname.replace(/^www\./,''); } catch { site.textContent = 'Saved page'; }
    site.title = item.title || item.pageUrl;
    const time = document.createElement('span'); const date = new Date(item.timestamp);
    time.textContent = Number.isFinite(date.getTime()) ? `· ${date.toLocaleDateString(undefined, { month:'short',day:'numeric' })}` : '';
    meta.append(site,time); content.append(quote,meta);
    const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = '×'; remove.title = 'Remove highlight'; remove.setAttribute('aria-label', `Remove highlight: ${item.text.slice(0,40)}`);
    remove.onclick = async () => { remove.disabled = true; await mutate({ operation:'remove',id:item.id,url:item.pageUrl }); remove.disabled = false; };
    const copy = document.createElement('button'); copy.className = 'copy-button';
    copy.title = 'Copy text'; copy.setAttribute('aria-label', `Copy highlight: ${item.text.slice(0,40)}`);
    copy.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>';
    copy.onclick = async () => { try { await TextMarker.copy(item.text); status('Copied to clipboard.'); } catch { status('Could not copy. Please try again.'); } };
    card.append(dot,content,copy,remove); $('list').append(card);
  }
}
async function load() { try { saved = entries((await chrome.storage.local.get(KEY))[KEY]); render(); } catch { status('Could not load highlights. Reopen Text Marker to try again.'); } }
async function mutate(change) {
  try { const result = await chrome.runtime.sendMessage({ type:'marker:mutate',...change }); if (!result?.ok) throw new Error(result?.error); await load(); return true; }
  catch { status('Could not save changes. Try again or check your available browser storage.'); return false; }
}
async function focus(item) {
  let target; try { target = new URL(item.pageUrl); } catch { return status('This saved page has an invalid address.'); }
  if (!['http:','https:'].includes(target.protocol)) return status('Only HTTP and HTTPS pages can be opened.');
  if (onPage(item) && tabId) {
    try { const result = await chrome.tabs.sendMessage(tabId,{type:'marker:focus',id:item.id});
      if (!result?.found) status('This passage could not be found. The page may have changed.'); else window.close();
    } catch { status('Reload this webpage to activate Text Marker. Chrome internal pages, the Web Store and built-in PDF viewer are not supported.'); }
  } else { await chrome.tabs.create({url:target.href}); }
}
function setScope(value) {
  all = value;
  $('pageTab').setAttribute('aria-selected',String(!all)); $('allTab').setAttribute('aria-selected',String(all));
  $('list').setAttribute('aria-labelledby',all ? 'allTab' : 'pageTab');
  $('confirm').hidden = true; pendingClear = null; render();
}
$('pageTab').onclick = () => setScope(false); $('allTab').onclick = () => setScope(true);
for (const id of ['pageTab','allTab']) $(id).onkeydown = event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); setScope(event.key === 'End' || (event.key !== 'Home' && !all)); $(all ? 'allTab' : 'pageTab').focus(); } };
$('search').oninput = render;
function askClear(operation) {
  pendingClear = operation;
  $('confirmMessage').textContent = operation === 'clearAll'
    ? `Delete all ${saved.length} highlights from every page? This cannot be undone. Export a copy first if you want to keep them.`
    : 'Remove all highlights from this page?';
  $('confirmClear').textContent = operation === 'clearAll' ? 'Delete all highlights' : 'Remove highlights';
  $('confirm').hidden = false; $('cancelClear').focus();
}
$('clearPage').onclick = () => askClear('clearPage');
$('clearAll').onclick = () => askClear('clearAll');
$('cancelClear').onclick = () => { $('confirm').hidden = true; pendingClear = null; $(all ? 'clearAll' : 'clearPage').focus(); };
$('confirmClear').onclick = async () => {
  if (!pendingClear) return;
  const operation = pendingClear;
  $('confirmClear').disabled = true; $('cancelClear').disabled = true;
  const success = await mutate({operation,url});
  $('confirmClear').disabled = false; $('cancelClear').disabled = false;
  if (success) {
    $('confirm').hidden = true; pendingClear = null;
    status(operation === 'clearAll' ? 'All highlights deleted from every page.' : 'Highlights removed from this page.');
    $(all ? 'allTab' : 'pageTab').focus();
  }
};
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ format:'text-marker',version:1,exportedAt:new Date().toISOString(),highlights:saved },null,2)],{type:'application/json'});
  const address = URL.createObjectURL(blob), anchor = document.createElement('a');
  anchor.href = address; anchor.download = `text-marker-${new Date().toISOString().slice(0,10)}.json`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(address),30000);
  status('Export started. Keep the JSON file as a copy of your highlights.');
};
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[KEY]) load(); });
(async () => {
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (tab?.url) { url = pageKey(tab.url); tabId = tab.id; }
    if (!/^https?:/.test(url) || /^(https:\/\/chromewebstore\.google\.com\/|https:\/\/chrome\.google\.com\/webstore)/.test(url)) status('Highlight on regular webpages. Chrome internal pages, the Web Store and built-in PDF viewer are not supported.');
  } catch { status('Open a webpage to view its highlights. Your collection is available in All pages.'); }
  await load();
})();
