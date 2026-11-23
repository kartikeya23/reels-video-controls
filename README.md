# Reels Video Controls

A Firefox extension that adds real video controls to Instagram Reels and feed videos.

## Features

- Play/pause, skip ±5s
- Seek bar with buffered indicator and hover time preview
- Current time / duration
- Mute + volume slider (mouse wheel works too)
- Playback speed 0.25×–3× (click = faster, right-click = slower, wheel)
- Fullscreen (switches to Firefox's native controls while fullscreen)
- Remembers volume, mute and speed across reels

### Keyboard shortcuts

| Key | Action |
|---|---|
| `k` | Play / pause |
| `←` / `→` | Back / forward 5s |
| `j` / `l` | Back / forward 10s |
| `m` | Mute |
| `f` | Fullscreen |
| `Shift` + `>` / `<` | Faster / slower |
| `,` / `.` | Frame step (while paused) |
| `0`–`9` | Jump to 0–90% |

## Development

```sh
npm install
npm start        # launches a temporary Firefox profile with the extension on instagram.com/reels
npm run lint     # Mozilla's add-on linter
npm run build    # zip into dist/
```

Or load manually: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `src/manifest.json`.

## Distribution

Upload the build from `dist/` to [addons.mozilla.org](https://addons.mozilla.org/developers/) as **unlisted** to get a signed `.xpi` you can install permanently.
