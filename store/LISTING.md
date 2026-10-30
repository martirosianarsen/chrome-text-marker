# Chrome Web Store update — 1.1.0

Update the existing listing, item ID `njeijdibkglhjgjcjlpkapbojpegfcll`. Do not create a duplicate item. If the dashboard has a version greater than or equal to 1.1.0, increment the manifest and package versions before building and uploading.

## Short description

Highlight passages in five colors. Find, revisit and export your saved highlights. Private, local, and free.

## Detailed description

Keep the words that stay with you.

Text Marker is a simple, private way to collect meaningful passages as you read. Select text on a webpage and choose one of five soft highlight colors. Your highlights are saved on your device and restored when you return to the page.

• A clean, calm interface with yellow, green, blue, pink, and orange highlights.
• Copy selected text or any saved highlight with a single click.
• Browse highlights from the current page or your whole collection.
• Search by passage, page title, or address.
• Jump to a highlight on the current page, or reopen its saved webpage.
• Export your full collection as a JSON file.
• Remove individual highlights, clear a page, or delete the full collection with confirmation.

No account, ads, analytics, or cloud service. Your highlights, page addresses, titles, and text used to restore selections stay in your browser's local extension storage. Exported files stay on your device unless you share them yourself.

Works on ordinary HTTP and HTTPS webpages. Chrome internal pages, the Chrome Web Store, editable fields, and the built-in PDF viewer are not supported. If a page's content changes substantially, an older passage may no longer be found; it remains available in your collection. Refresh existing tabs after updating the extension.

## What's new

Redesigned popup and color picker; one-click copying; searchable collection; JSON export; safer cross-element highlighting; more reliable restoration; live updates between tabs; fewer permissions; preserved existing saved highlights.

## Single purpose

Help users highlight, save, copy, find, and revisit passages from webpages, with all highlight data stored locally on their device.

## Permission justifications

- `storage`: Save highlighted passages, their colors, page URLs/titles, timestamps, and anchoring text/positions locally, so highlights can be restored and managed.
- `activeTab`: Identify the active webpage when the user opens the extension popup, show highlights for that page, and navigate to a chosen passage on that tab.
- Content script matches `http://*/*` and `https://*/*`: Read selected text, display the color picker, and automatically restore saved highlights when the user revisits a matching webpage. No browsing history is collected or sent to a server.

The old `tabs` permission and web-accessible popup declaration have been removed. There is no remotely hosted executable code.

## Privacy disclosures

Host the included privacy policy at a publicly accessible URL and put that URL into the listing's privacy field. The packaged privacy page is available inside the extension, but a `chrome-extension://` URL cannot be used as the public policy URL.

Review the current dashboard categories against the policy and real behavior. Selected webpage content, URLs, titles, and nearby anchoring text are handled locally; they are not transmitted to the developer or a third party. Do not claim the extension never handles webpage content. No financial, authentication, health, or identity data is requested. Do not claim a cloud backup or sync feature.

Only certify the dashboard's data-use statements after reviewing them. The implementation does not sell data, transfer it for unrelated purposes, or use it for creditworthiness/lending.

## Upload checklist

1. Open the existing item's Package tab. Verify the ID and current published version.
2. Upload `text-marker-1.1.0.zip` as a new version, preserving the existing item and user storage.
3. Review permissions, listing text, public privacy-policy URL, and privacy declarations.
4. Add the supplied 1280 × 800 screenshot, then save the listing.
5. Submit for review. Submission and Google's approval are separate steps.

Official references checked October 30, 2026:
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/policies
