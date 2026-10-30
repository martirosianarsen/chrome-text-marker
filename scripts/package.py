"""Build a reproducible Chrome Web Store ZIP with runtime files only."""
import json
import sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist'
out.mkdir(parents=True, exist_ok=True)
files = ['manifest.json', 'background.js', 'shared.js', 'content.js', 'styles.css', 'popup.html', 'popup.css', 'popup.js', 'privacy.html', 'privacy.css', 'settings.html', 'settings.css', 'settings.js']
files += [f'icons/text_marker_{size}.png' for size in (16,32,48,128)]
for name in files:
    if not (root / name).is_file():
        raise SystemExit(f'Missing runtime file: {name}')
target = out / f'text-marker-{manifest["version"]}.zip'
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for name in sorted(files):
        info = ZipInfo(name, (2026,10,30,0,0,0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, (root / name).read_bytes())
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('manifest.json'))['version'] == manifest['version']
print(f'{target} ({target.stat().st_size:,} bytes; {len(files)} files)')
