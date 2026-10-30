/* Shared data rules, also loaded in the isolated content-script world. */
(() => {
  const KEY = 'text-marker-highlights';
  const PALETTE_KEY = 'text-marker-palette';
  const COLORS = { yellow: '#ffe58a', green: '#bce9c6', blue: '#b8d9ff', pink: '#fac8df', orange: '#ffd2a8' };
  const paletteFrom = value => Object.fromEntries(Object.entries(COLORS).map(([name, fallback]) => [name, /^#[0-9a-f]{6}$/i.test(value?.[name]) ? value[name] : fallback]));
  const isColor = color => typeof color === 'string' && (Object.hasOwn(COLORS, color) || /^#[0-9a-f]{6}$/i.test(color));
  const colorValue = color => COLORS[color] || (/^#[0-9a-f]{6}$/i.test(color) ? color : COLORS.yellow);
  function foreground(color) {
    const luminance = hex => {
      const rgb = hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
      return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
    };
    const light = luminance(colorValue(color)), ink = luminance('#192b25');
    if ((light+.05)/(ink+.05) >= 4.5) return '#192b25';
    return 1.05/(light+.05) >= 4.5 ? '#ffffff' : '#000000';
  }
  const pageKey = value => { const url = new URL(value); url.hash = ''; return url.href; };
  function valid(item) {
    return item && typeof item.id === 'string' && typeof item.text === 'string' && item.text.length > 0;
  }
  function entries(stored) {
    return Object.entries(stored || {}).flatMap(([url, items]) => Array.isArray(items)
      ? items.filter(valid).map(item => ({ ...item, pageUrl: url, color: isColor(item.color) ? item.color : 'yellow' })) : []);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* Some webpages block Clipboard API access. */ }
    const input = document.createElement('textarea');
    input.value = text; input.style.cssText = 'position:fixed;left:-10000px;top:0';
    document.body.append(input); input.select();
    const success = document.execCommand('copy'); input.remove();
    if (!success) throw new Error('Clipboard is unavailable.');
  }
  globalThis.TextMarker = { KEY, PALETTE_KEY, COLORS, paletteFrom, pageKey, entries, valid, copy, isColor, colorValue, foreground };
})();
