'use strict';
const { PALETTE_KEY, COLORS, paletteFrom } = TextMarker;
const presets = document.getElementById('presets'), status = document.getElementById('settingsStatus');
function render(palette) {
  presets.replaceChildren();
  Object.entries(palette).forEach(([name,color],index) => {
    const label = document.createElement('label'); label.className = 'preset';
    const caption = document.createElement('span'); caption.textContent = `Color ${index+1}`;
    const input = document.createElement('input'); input.type = 'color'; input.value = color; input.name = name; input.setAttribute('aria-label', `Preset color ${index+1}`);
    const output = document.createElement('span'); output.className = 'hex'; output.textContent = color;
    input.oninput = () => { output.textContent = input.value; status.textContent = 'Unsaved changes. Choose Save colors to apply them.'; };
    label.append(caption,input,output); presets.append(label);
  });
}
render(COLORS);
chrome.storage.local.get(PALETTE_KEY).then(result => render(paletteFrom(result[PALETTE_KEY]))).catch(() => { status.textContent = 'Could not load your colors. Reopen this page to try again.'; });
document.getElementById('reset').onclick = () => { render(COLORS); status.textContent = 'Default colors selected. Choose Save colors to apply them.'; };
document.getElementById('paletteForm').onsubmit = async event => {
  event.preventDefault();
  const save = document.getElementById('save'); save.disabled = true;
  const palette = Object.fromEntries([...presets.querySelectorAll('input')].map(input => [input.name,input.value]));
  try { await chrome.storage.local.set({[PALETTE_KEY]:palette}); status.textContent = 'Colors saved. Your new palette is ready on open webpages.'; }
  catch { status.textContent = 'Could not save colors. Please try again.'; }
  finally { save.disabled = false; }
};
