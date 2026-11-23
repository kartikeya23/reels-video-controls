# Reels Video Controls

A Firefox extension that adds real video controls to Instagram Reels and feed videos.

## Install

Requires Firefox 142 or newer. Submitted to [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/reels-video-controls/); the link works once Mozilla approves it. Until then, load it manually (see [Development](#development)).

## Features

- Play/pause, skip ±5s
- Seek bar with buffered indicator and hover time preview
- Current time / duration
- Mute + volume slider (mouse wheel works too)
- Playback speed 0.25×–3× (click = faster, right-click = slower, wheel)
- Fullscreen (switches to Firefox's native controls while fullscreen)
- Remembers volume, mute and speed across reels, even when Instagram mutes a new reel by itself
- Hides Instagram's own mute button and volume slider on reels pages (English interface only)

### Keyboard shortcuts

| Key | Action |
|---|---|
| `k` | Play / pause |
| `←` / `→` | Back / forward 5s |
| `j` / `l` | Back / forward 10s |
| `m` | Mute |
| `f` | Fullscreen |
| `Shift` + `>` / `<` | Faster / slower |
| `,` / `.` | Back / forward 1/30s (while paused) |
| `0`–`9` | Jump to 0–90% |

## Development

Needs Node.js 20 or newer.

```sh
npm install
npm start        # launches a temporary Firefox profile with the extension on instagram.com/reels
npm run lint     # Mozilla's add-on linter
npm run build    # zip into dist/
```

Or load manually: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `src/manifest.json`. It is removed when Firefox quits.

On macOS, if `npm start` fails with `ECONNREFUSED` and Firefox says its profile cannot be loaded, the terminal may lack access to Firefox's data folder. Load the extension manually instead.

## Privacy

No data is collected and the extension makes no network requests. Volume, mute and speed settings are stored locally in the browser.

## Known limitations

- After a page refresh, sound may stay off until you click the page and move to another reel (Firefox autoplay rules).
- Muting from Firefox's Picture-in-Picture window may be reverted.
- On a non-English Instagram, the native mute button stays visible on reels, but its changes are reverted.

## Releasing

1. Raise `version` in `src/manifest.json`.
2. Run `npm run lint` and `npm run build`.
3. Upload the zip from `dist/` as a new version in the [Developer Hub](https://addons.mozilla.org/developers/). Mozilla signs it.

## License

[MIT](LICENSE). Not affiliated with or endorsed by Instagram or Meta.
