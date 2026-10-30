/* Shared data rules, also loaded in the isolated content-script world. */
(() => {
  const KEY = 'text-marker-highlights';
  const COLORS = { yellow: '#ffe58a', green: '#bce9c6', blue: '#b8d9ff', pink: '#fac8df', orange: '#ffd2a8' };
  const pageKey = value => { const url = new URL(value); url.hash = ''; return url.href; };
  function valid(item) {
    return item && typeof item.id === 'string' && typeof item.text === 'string' && item.text.length > 0;
  }
  function entries(stored) {
    return Object.entries(stored || {}).flatMap(([url, items]) => Array.isArray(items)
      ? items.filter(valid).map(item => ({ ...item, pageUrl: url, color: Object.hasOwn(COLORS, item.color) ? item.color : 'yellow' })) : []);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Some webpages block Clipboard API access. */ }
    const input = document.createElement('textarea');
    input.value = text; input.style.cssText = 'position:fixed;left:-10000px;top:0';
    document.body.append(input); input.select();
    const success = document.execCommand('copy'); input.remove();
    if (!success) throw new Error('Clipboard is unavailable.');
  }
  globalThis.TextMarker = { KEY, COLORS, pageKey, entries, valid, copy };
})();
