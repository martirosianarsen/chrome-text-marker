# Text Marker

A private webpage text highlighter for Chrome. Version 1.1.0 refreshes the popup and selection picker while retaining highlights from 1.0.0.

[Chrome Web Store](https://chromewebstore.google.com/detail/njeijdibkglhjgjcjlpkapbojpegfcll)

## Use

Select text on an ordinary webpage, then choose one of five pastel colors. The picker also copies selected text. Click a highlighted passage to copy or remove it.

Open the extension to browse the current page or all pages, search your saved passages, copy them, export a JSON copy, or remove them. In All pages, Delete all highlights clears the full collection after confirmation. Clicking a passage on the current page scrolls to it; a passage from another page opens its saved URL.

All data stays in local extension storage. No telemetry, accounts, or external code. [Privacy policy](PRIVACY.md).

Chrome internal pages, the Web Store, editable controls, and the built-in PDF viewer are unsupported. The content script runs in the top-level document; iframe and shadow-root text are not indexed. Changed or ambiguous passages may not restore automatically, but their saved text stays in the library. Export is a read-only JSON backup; importing is not implemented. Reload open tabs after installing an update.

## Develop and verify

Use Node.js 24+, Python 3.12+, and Chrome 111+.

```sh
npm ci
npx playwright install chromium
npm test
python3 scripts/package.py
```

Load the repository folder using Chrome's **Extensions → Developer mode → Load unpacked** for development. The integration suite loads the real extension in an isolated Chrome profile and checks highlighting across HTML elements, duplicate quotes, reload restoration, legacy records, dynamic pages, concurrent writes, SPA navigation, editable fields, search, export, safe rendering, deletion, and copying.

For the standalone design demo, run `python3 -m http.server 8765 --bind 127.0.0.1` and open `http://127.0.0.1:8765/preview.html`. The preview uses separate sample storage and is excluded from the Web Store ZIP.

## Release

The build script includes only runtime files and required icons. See [store listing and upload instructions](store/LISTING.md). Update the existing Store item to preserve its ID and the users' saved local data.

Writes go through the service worker to serialize simultaneous changes from tabs and the popup. Records retain the original storage key and old hash-specific records are read without a destructive migration. New records use fragment-free URLs and text anchors. Query parameters remain significant to distinguish different documents.

The original README described the project as MIT licensed, but the repository did not contain a license file. This change does not invent or replace license terms; the owner should supply the intended license separately.
