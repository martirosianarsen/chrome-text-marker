(() => {
  'use strict';
  if (globalThis.__textMarkerLoaded) return;
  globalThis.__textMarkerLoaded = true;
  const { KEY, PALETTE_KEY, COLORS, paletteFrom, pageKey, entries } = TextMarker;
  const ATTR = 'data-text-marker-id';
  const excluded = 'script,style,noscript,textarea,input,select,option,[contenteditable]:not([contenteditable="false"]),[data-text-marker-ui]';
  let selected = null, currentUrl = pageKey(location.href), records = [], scheduled, syncing = false;
  const host = document.createElement('div');
  host.setAttribute('data-text-marker-ui', '');
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;display:none;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{color-scheme:light}*{box-sizing:border-box}section{width:252px;padding:14px;background:#fff;border:1px solid #e4e5e9;border-radius:16px;box-shadow:0 8px 32px #202b3824;font:13px system-ui;color:#26352f}
    header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}strong{font-size:12px;font-weight:650}small{font-size:10px;color:#78847c}.colors{display:flex;gap:10px}button{cursor:pointer;font:inherit;border:0;background:transparent;color:inherit}button:focus-visible{outline:2px solid #22664d;outline-offset:3px}.swatch{width:36px;height:36px;border-radius:50%;border:1px solid #00000012;transition:transform .15s}.swatch:hover{transform:translateY(-3px)}footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px}.custom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #e4e5e9;font-size:11px}.custom label{display:flex;align-items:center;gap:8px}.custom input{width:30px;height:26px;padding:1px;border:1px solid #e4e5e9;border-radius:5px;cursor:pointer;background:white}.custom button{background:#edf2e7;border-radius:5px;padding:5px 8px;color:#316c50}.copy{font-size:11px;color:#316c50;padding:4px 6px;border:1px solid #e4e5e9;border-radius:5px}.remove{font-size:11px;color:#9e433b;padding:4px 0}.close{font-size:18px;line-height:1;padding:0 3px}p{margin:9px 0 0;font-size:11px;line-height:1.5;color:#9e433b}[hidden]{display:none}
    @media(prefers-reduced-motion:reduce){*{transition:none!important}}
  </style><section role="dialog" aria-label="Highlight selected text"><header><strong>Mark this moment</strong><button class="close" aria-label="Close color picker">×</button></header><div class="colors"></div><div class="custom"><label>Custom color <input type="color" aria-label="Custom highlight color" value="#b8b3f6"></label><button class="custom-apply" aria-label="Apply custom highlight color">Apply</button></div><footer><small>Text Marker</small><button class="copy">Copy text</button><button class="remove" hidden>Remove</button></footer><p role="status" hidden></p></section>`;
  document.documentElement.append(host);
  let palette = { ...COLORS };
  function renderPalette() {
    root.querySelector('.colors').replaceChildren();
    Object.entries(palette).forEach(([name, hex], index) => {
      const button = document.createElement('button');
      button.className = 'swatch'; button.style.background = hex;
      button.setAttribute('aria-label', `Highlight preset ${index + 1}`); button.title = `Color ${index + 1}: ${hex}`;
      button.addEventListener('click', () => add(hex));
      root.querySelector('.colors').append(button);
    });
  }
  renderPalette();
  chrome.storage.local.get(PALETTE_KEY).then(result => { palette = paletteFrom(result[PALETTE_KEY]); renderPalette(); }).catch(() => {});
  root.querySelector('.custom-apply').onclick = () => add(root.querySelector('input[type=color]').value);
  root.querySelector('.close').onclick = hide;
  root.querySelector('.copy').onclick = async () => {
    const text = selected?.range?.toString() || records.find(item => item.id === selected?.id)?.text;
    if (!text) return;
    try { await TextMarker.copy(text); const node = root.querySelector('p'); node.textContent = 'Copied to clipboard.'; node.style.color = '#316c50'; node.hidden = false; }
    catch { error('Could not copy. Try copying from the Text Marker popup.'); }
  };
  root.querySelector('.remove').onclick = async () => {
    const id = selected?.id;
    if (id && await mutate({ operation: 'remove', id })) { unwrap(id); hide(); }
  };
  root.addEventListener('pointerdown', event => { if (!event.target.closest('input,label')) event.preventDefault(); });
  function hide() { host.style.display = 'none'; selected = null; }
  function error(text) { const node = root.querySelector('p'); node.textContent = text; node.style.color = '#9e433b'; node.hidden = false; }
  async function mutate(change) {
    try {
      const result = await chrome.runtime.sendMessage({ type: 'marker:mutate', url: currentUrl, ...change });
      if (!result?.ok) throw new Error(result?.error);
      return true;
    } catch { error('Could not save. Reopen this page or check available browser storage.'); return false; }
  }
  function textMap() {
    const nodes = []; let text = '';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode(node) {
      return node.parentElement?.closest(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }});
    let node;
    while ((node = walker.nextNode())) { nodes.push({ node, start: text.length, end: text.length + node.length }); text += node.data; }
    return { nodes, text };
  }
  function offsets(range, map) {
    let start = null, end = null;
    for (const part of map.nodes) {
      if (!range.intersectsNode(part.node)) continue;
      const from = range.startContainer === part.node ? range.startOffset : 0;
      const to = range.endContainer === part.node ? range.endOffset : part.node.length;
      if (to <= from) continue;
      if (start === null) start = part.start + from;
      end = part.start + to;
    }
    return start === null ? null : { start, end };
  }
  function paint(item, start, end, map) {
    const parts = map.nodes.filter(part => part.end > start && part.start < end);
    if (parts.some(part => part.node.parentElement.closest(`[${ATTR}]`))) return false;
    for (const part of parts.reverse()) {
      const range = document.createRange();
      range.setStart(part.node, Math.max(0, start - part.start));
      range.setEnd(part.node, Math.min(part.node.length, end - part.start));
      const span = document.createElement('span');
      span.setAttribute(ATTR, item.id); span.className = 'text-marker-highlight';
      span.style.setProperty('background-color', TextMarker.colorValue(item.color), 'important');
      span.style.setProperty('color', TextMarker.foreground(item.color), 'important');
      range.surroundContents(span);
    }
    return true;
  }
  function unwrap(id) {
    for (const span of document.querySelectorAll(`[${ATTR}]`)) {
      if (id && span.getAttribute(ATTR) !== id) continue;
      const parent = span.parentNode;
      span.replaceWith(...span.childNodes); parent.normalize();
    }
  }
  function locate(item, text) {
    if (item.anchor && text.slice(item.anchor.start, item.anchor.end) === item.text) return item.anchor.start;
    const matches = []; let at = text.indexOf(item.text);
    while (at !== -1) { matches.push(at); at = text.indexOf(item.text, at + 1); }
    if (matches.length === 1) return matches[0];
    if (item.anchor) {
      const ranked = matches.map(start => ({ start, score:
        (item.anchor.prefix && text.slice(Math.max(0, start - item.anchor.prefix.length), start) === item.anchor.prefix ? 1 : 0) +
        (item.anchor.suffix && text.slice(start + item.text.length, start + item.text.length + item.anchor.suffix.length) === item.anchor.suffix ? 1 : 0) }));
      ranked.sort((a,b) => b.score - a.score);
      if (ranked[0]?.score > 0 && ranked[0].score > (ranked[1]?.score || 0)) return ranked[0].start;
    }
    // Ambiguous legacy quotes stay in the library rather than marking the wrong passage.
    return -1;
  }
  function restore() {
    if (syncing) return;
    syncing = true; observer.disconnect();
    try {
      const savedIds = new Set(records.map(item => item.id));
      for (const span of document.querySelectorAll(`[${ATTR}]`)) if (!savedIds.has(span.getAttribute(ATTR))) unwrap(span.getAttribute(ATTR));
      for (const item of records) {
        if ([...document.querySelectorAll(`[${ATTR}]`)].some(span => span.getAttribute(ATTR) === item.id)) continue;
        const map = textMap(), start = locate(item, map.text);
        if (start >= 0) paint(item, start, start + item.text.length, map);
      }
    } finally { syncing = false; observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  }
  async function load() {
    try {
      const stored = (await chrome.storage.local.get(KEY))[KEY];
      records = entries(stored).filter(item => pageKey(item.pageUrl) === currentUrl);
      restore();
    } catch { /* An extension update may invalidate this tab; the popup asks for a reload. */ }
  }
  async function add(color) {
    if (!selected?.range) return;
    const map = textMap(), position = offsets(selected.range, map);
    if (!position) return hide();
    if (map.nodes.some(part => part.end > position.start && part.start < position.end && part.node.parentElement.closest(`[${ATTR}]`))) {
      error('This selection overlaps a highlight. Remove it first.'); return;
    }
    const item = { id: crypto.randomUUID(), text: map.text.slice(position.start, position.end), color, timestamp: Date.now(), title: document.title,
      anchor: { ...position, prefix: map.text.slice(Math.max(0, position.start - 40), position.start), suffix: map.text.slice(position.end, position.end + 40) } };
    if (await mutate({ operation: 'add', item })) { await load(); window.getSelection().removeAllRanges(); hide(); }
  }
  function show(rect) {
    root.querySelector('p').hidden = true;
    root.querySelector('.remove').hidden = !selected?.id;
    host.style.display = 'block';
    host.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 268))}px`;
    host.style.top = `${Math.max(8, Math.min(rect.bottom + 10, innerHeight - host.getBoundingClientRect().height - 8))}px`;
  }
  function selection() {
    const value = window.getSelection();
    if (!value?.rangeCount || value.isCollapsed || !value.toString().trim()) return;
    const range = value.getRangeAt(0);
    if (!document.body.contains(range.commonAncestorContainer)) return;
    // Never read text from a selection crossing an editor or a form field.
    const element = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (element.closest(excluded) || [...element.querySelectorAll(excluded)].some(node => range.intersectsNode(node))) return;
    selected = { range: range.cloneRange() }; show(range.getBoundingClientRect());
  }
  document.addEventListener('pointerup', event => {
    if (event.composedPath().includes(host)) return;
    setTimeout(selection, 0);
  });
  document.addEventListener('keyup', event => { if (event.key === 'Escape') hide(); else if (event.key.startsWith('Arrow') && event.shiftKey) selection(); });
  document.addEventListener('pointerdown', event => { if (!event.composedPath().includes(host)) hide(); });
  document.addEventListener('click', event => {
    const span = event.target.closest?.(`[${ATTR}]`);
    if (span && window.getSelection().isCollapsed) { selected = { id: span.getAttribute(ATTR) }; show(span.getBoundingClientRect()); }
  });
  document.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
  chrome.storage.onChanged.addListener((changes, area) => { if (area !== 'local') return; if (changes[KEY]) load(); if (changes[PALETTE_KEY]) { palette = paletteFrom(changes[PALETTE_KEY].newValue); renderPalette(); } });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== 'marker:focus') return;
    const span = [...document.querySelectorAll(`[${ATTR}]`)].find(node => node.getAttribute(ATTR) === message.id);
    if (span) { span.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); span.animate([{ outline:'3px solid #297357' },{ outline:'3px solid transparent' }], {duration:1600}); }
    respond({ found: !!span });
  });
  const observer = new MutationObserver(() => { clearTimeout(scheduled); scheduled = setTimeout(restore, 250); });
  // SPA navigation changes the record set even when the content script stays alive.
  setInterval(() => { const next = pageKey(location.href); if (next !== currentUrl) { hide(); unwrap(); currentUrl = next; load(); } }, 700);
  load();
})();
