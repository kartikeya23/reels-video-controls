# CLAUDE.md

Firefox WebExtension (Manifest V2) that overlays video controls on Instagram videos. Plain JS/CSS, no build step, no bundler.

## Layout

- `src/manifest.json` — MV2 manifest. MV2 is deliberate: in Firefox MV3, content-script host access is user-grantable/optional, which adds friction. Gecko id: `reels-video-controls@local`.
- `src/content.js` — everything: UI construction, active-video tracking, actions, media event wiring, keyboard shortcuts.
- `src/content.css` — styles, all scoped under `#igvc-bar` / `#igvc-toast`. Prefix new classes with `igvc-`.
- `src/icons/icon.svg`

## How it works (key design decisions)

- **One global bar appended to `document.body`, `position: fixed`**, repositioned every animation frame over the "active" video's visible rect. This avoids Instagram's stacking contexts / overlay divs and survives their frequent DOM/class-name changes. Do not rely on Instagram's class names.
- **Active video** = the `<video>` with the largest visible area (playing videos weighted ×2), re-picked every 300ms and on scroll. Visible rect is clipped by the video's parent (reels crop with object-fit) and the viewport.
- Pointer/click events on the bar are `stopPropagation`'d so Instagram's handlers (tap-to-pause/mute) don't fire. React's root listener isn't an ancestor of `body`-level nodes anyway.
- Media events don't bubble, so they're listened to on `document` in the capture phase.
- **Prefs** (`volume`, `muted`, `speed`, `userSetVolume`) live in `browser.storage.local` and are reapplied on every `play`. Unmuting is skipped unless `navigator.userActivation.hasBeenActive`, otherwise Firefox's autoplay policy pauses the video.
- `volumechange` is async, so it is compared with prefs (no own-write flag). Mismatches are saved only after a click over that video outside reels pages, or in fullscreen; otherwise prefs are reapplied (max 5 times), because Instagram mutes new reels itself. The native mute button is hidden on reels via `html[data-igvc-reels]`.
- Fullscreen: `video.requestFullscreen()` + temporarily set `video.controls = true` (our body-level bar isn't visible inside element fullscreen); removed on exit.
- No DOM HTML strings (`innerHTML`) — AMO's linter flags them. Build nodes with `el()` / `icon()` helpers.

## Commands

- `npm start` — `web-ext run` against instagram.com/reels (needs Firefox installed; log into Instagram in the temp profile)
- `npm run lint` — run before committing
- `npm run build` — zip to `dist/`

## Testing

No automated tests yet. Manual check: reels page (`/reels/`), a single reel (`/reel/<id>`), home feed videos, a post modal, and a profile's reels tab. Verify: bar tracks the video while scrolling, seek drag, volume persists across reels, keyboard shortcuts don't fire while typing in comments/DMs.

## Ideas / backlog

- Options page (toggle features, default speed, hide-delay, custom shortcuts)
- Toolbar button to enable/disable per site
- Auto-scroll to next reel when one ends (Instagram loops by default)
- Download / copy-timestamp link
- Support Facebook reels
