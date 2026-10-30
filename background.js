importScripts('shared.js');
const { KEY, pageKey, entries, valid } = TextMarker;
// One writer serializes changes across tabs and the popup, preventing lost updates.
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'marker:mutate') return;
  queue = queue.catch(() => {}).then(async () => {
    if (message.operation === 'clearAll') {
      if (!sender.url?.startsWith(chrome.runtime.getURL(''))) throw new Error('Use the extension popup to clear your collection.');
      await chrome.storage.local.set({ [KEY]: {} });
      return { ok: true };
    }
    const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
    const url = pageKey(sender.url?.startsWith('chrome-extension:') ? message.url : (sender.tab?.url || message.url));
    if (!/^https?:/.test(url)) throw new Error('This page is not supported.');
    if (message.operation === 'add') {
      if (!valid(message.item) || !TextMarker.isColor(message.item.color)) throw new Error('Invalid highlight.');
      // Consolidate old hash-specific records without discarding existing highlights.
      const list = entries(stored).filter(item => pageKey(item.pageUrl) === url);
      for (const key of Object.keys(stored)) if (pageKey(key) === url) delete stored[key];
      stored[url] = [...list.filter(item => item.id !== message.item.id), { ...message.item, pageUrl: url }];
    } else if (message.operation === 'recolor') {
      if (typeof message.id !== 'string' || !TextMarker.isColor(message.color)) throw new Error('Invalid highlight color.');
      let found = false;
      for (const key of Object.keys(stored)) {
        if (pageKey(key) !== url || !Array.isArray(stored[key])) continue;
        stored[key] = stored[key].map(item => {
          if (item.id !== message.id) return item;
          found = true;
          return { ...item, color: message.color };
        });
      }
      if (!found) throw new Error('This highlight no longer exists.');
    } else if (message.operation === 'remove' || message.operation === 'clearPage') {
      for (const key of Object.keys(stored)) {
        if (pageKey(key) !== url) continue;
        stored[key] = message.operation === 'clearPage' ? [] : stored[key].filter(item => item.id !== message.id);
        if (!stored[key].length) delete stored[key];
      }
    } else throw new Error('Unknown operation.');
    await chrome.storage.local.set({ [KEY]: stored });
    return { ok: true };
  });
  queue.then(respond, () => respond({ ok: false, error: 'Could not save changes. Please try again; your browser storage may be full.' }));
  return true;
});
