(() => {
  "use strict";

  if (window.__igvcLoaded) return;
  window.__igvcLoaded = true;

  const api = typeof browser !== "undefined" ? browser : chrome;
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const BAR_HEIGHT = 44;
  const HIDE_DELAY = 2200;

  // ---------- Preferences (persisted) ----------
  const prefs = { volume: 1, muted: false, speed: 1, userSetVolume: false };
  try {
    api.storage.local.get(prefs).then((p) => Object.assign(prefs, p), () => {});
  } catch (_) {}
  let saveTimer = null;
  function savePrefs() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { api.storage.local.set(prefs); } catch (_) {}
    }, 300);
  }

  // ---------- Small DOM helpers ----------
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ICONS = {
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    volHigh: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z",
    volLow: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4z",
    volMute: "M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
    fsEnter: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
    fsExit: "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
    back: "M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
    fwd: "M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"
  };

  function icon(name) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }
  function setIcon(btn, name) {
    btn.replaceChildren(icon(name));
  }
  function el(tag, cls, attrs) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    t = Math.floor(t);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ---------- Build the control bar ----------
  const bar = el("div", "igvc-hidden", { id: "igvc-bar" });
  const playBtn = el("button", "", { title: "Play/Pause (k)" });
  const backBtn = el("button", "", { title: "Back 5s (←)" });
  const fwdBtn = el("button", "", { title: "Forward 5s (→)" });
  const curTime = el("span", "igvc-time igvc-current");
  const seekWrap = el("div", "igvc-seek");
  const track = el("div", "igvc-track");
  const buffered = el("div", "igvc-buffered");
  const played = el("div", "igvc-played");
  const hoverTime = el("div", "igvc-hover-time");
  const seek = el("input", "", { type: "range", min: "0", max: "1000", step: "1", value: "0", "aria-label": "Seek" });
  const durTime = el("span", "igvc-time igvc-duration");
  const volWrap = el("div", "igvc-volume");
  const muteBtn = el("button", "", { title: "Mute (m)" });
  const vol = el("input", "", { type: "range", min: "0", max: "1", step: "0.01", value: "1", "aria-label": "Volume" });
  const speedBtn = el("button", "igvc-speed", { title: "Speed — click: faster, right-click: slower (Shift+> / Shift+<)" });
  const fsBtn = el("button", "", { title: "Fullscreen (f)" });

  setIcon(playBtn, "play");
  setIcon(backBtn, "back");
  setIcon(fwdBtn, "fwd");
  setIcon(muteBtn, "volHigh");
  setIcon(fsBtn, "fsEnter");
  speedBtn.textContent = "1×";

  track.append(buffered, played);
  seekWrap.append(track, seek, hoverTime);
  volWrap.append(muteBtn, vol);
  bar.append(playBtn, backBtn, fwdBtn, curTime, seekWrap, durTime, volWrap, speedBtn, fsBtn);

  const toast = el("div", "", { id: "igvc-toast" });

  function mount() {
    if (!document.body) return;
    if (!bar.isConnected) document.body.appendChild(bar);
    if (!toast.isConnected) document.body.appendChild(toast);
  }
  mount();

  // Keep Instagram from reacting to interactions with our bar.
  for (const type of ["click", "dblclick", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend", "wheel", "contextmenu"]) {
    bar.addEventListener(type, (e) => e.stopPropagation());
  }

  // ---------- State ----------
  let active = null;       // the <video> currently controlled
  let activeRect = null;   // its visible rect
  let seeking = false;
  let hovering = false;
  let lastMove = 0;
  let fsControlsAdded = null;
  let ourVolumeChange = false;

  // ---------- Pick the video in view ----------
  function visibleRect(v) {
    const r = v.getBoundingClientRect();
    if (r.width < 120 || r.height < 120) return null;
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    // Clip by the parent (reels often crop the video) and the viewport.
    const p = v.parentElement;
    if (p) {
      const pr = p.getBoundingClientRect();
      left = Math.max(left, pr.left); top = Math.max(top, pr.top);
      right = Math.min(right, pr.right); bottom = Math.min(bottom, pr.bottom);
    }
    left = Math.max(left, 0); top = Math.max(top, 0);
    right = Math.min(right, window.innerWidth); bottom = Math.min(bottom, window.innerHeight);
    const w = right - left, h = bottom - top;
    if (w < 120 || h < 80) return null;
    return { left, top, width: w, height: h, right, bottom };
  }

  function pickVideo() {
    let best = null, bestScore = 0;
    for (const v of document.querySelectorAll("video")) {
      const r = visibleRect(v);
      if (!r) continue;
      let score = r.width * r.height;
      if (!v.paused) score *= 2;
      if (score > bestScore) { bestScore = score; best = v; }
    }
    if (best !== active) setActive(best);
  }

  function setActive(v) {
    active = v;
    if (!v) { bar.classList.add("igvc-hidden"); return; }
    bar.classList.remove("igvc-hidden");
    refreshAll();
  }

  // ---------- UI refresh ----------
  function refreshPlay() {
    if (active) setIcon(playBtn, active.paused ? "play" : "pause");
  }
  function refreshVolume() {
    if (!active) return;
    const muted = active.muted || active.volume === 0;
    setIcon(muteBtn, muted ? "volMute" : active.volume < 0.5 ? "volLow" : "volHigh");
    vol.value = muted ? 0 : active.volume;
  }
  function refreshSpeed() {
    if (!active) return;
    const r = active.playbackRate;
    speedBtn.textContent = (Number.isInteger(r) ? r : r.toString().replace(/^0/, "")) + "×";
  }
  function refreshFs() {
    setIcon(fsBtn, document.fullscreenElement ? "fsExit" : "fsEnter");
  }
  function refreshTime() {
    if (!active) return;
    const d = active.duration, t = active.currentTime;
    const ok = isFinite(d) && d > 0;
    curTime.textContent = fmt(t);
    durTime.textContent = ok ? fmt(d) : "--:--";
    if (!seeking) {
      const frac = ok ? t / d : 0;
      seek.value = Math.round(frac * 1000);
      played.style.width = frac * 100 + "%";
    }
    if (ok && active.buffered.length) {
      let end = 0;
      for (let i = 0; i < active.buffered.length; i++) {
        if (active.buffered.start(i) <= t + 0.5) end = Math.max(end, active.buffered.end(i));
      }
      buffered.style.width = clamp(end / d, 0, 1) * 100 + "%";
    } else {
      buffered.style.width = "0";
    }
  }
  function refreshAll() {
    refreshPlay(); refreshVolume(); refreshSpeed(); refreshFs(); refreshTime();
  }

  // ---------- Position + visibility loop ----------
  function shouldShow() {
    if (!active) return false;
    if (seeking || hovering) return true;
    if (active.paused) return true;
    return performance.now() - lastMove < HIDE_DELAY;
  }

  function frame() {
    if (active && !active.isConnected) setActive(null);
    if (active && !document.fullscreenElement) {
      activeRect = visibleRect(active);
      if (activeRect) {
        bar.classList.remove("igvc-hidden");
        bar.style.left = activeRect.left + "px";
        bar.style.top = activeRect.bottom - BAR_HEIGHT + "px";
        bar.style.width = activeRect.width + "px";
        bar.classList.toggle("igvc-narrow", activeRect.width < 380);
        bar.classList.toggle("igvc-visible", shouldShow());
        refreshTime();
      } else {
        bar.classList.add("igvc-hidden");
      }
    } else {
      bar.classList.add("igvc-hidden");
    }
    requestAnimationFrame(frame);
  }

  // Re-pick the active video regularly (Instagram is a SPA with infinite scroll).
  setInterval(() => { mount(); pickVideo(); }, 300);
  window.addEventListener("scroll", () => pickVideo(), { passive: true, capture: true });
  requestAnimationFrame(frame);

  document.addEventListener("mousemove", (e) => {
    if (!activeRect) return;
    const r = activeRect;
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      lastMove = performance.now();
    }
  }, { passive: true, capture: true });
  bar.addEventListener("mouseenter", () => { hovering = true; });
  bar.addEventListener("mouseleave", () => { hovering = false; lastMove = performance.now(); });

  // ---------- Actions ----------
  function togglePlay() {
    if (!active) return;
    if (active.paused) active.play().catch(() => {});
    else active.pause();
  }
  function seekBy(sec) {
    if (!active || !isFinite(active.duration)) return;
    active.currentTime = clamp(active.currentTime + sec, 0, active.duration - 0.05);
    flash((sec > 0 ? "+" : "−") + Math.abs(sec) + "s");
  }
  function seekToFraction(f) {
    if (!active || !isFinite(active.duration)) return;
    active.currentTime = clamp(f, 0, 1) * active.duration;
  }
  function setVolume(v, muted) {
    if (!active) return;
    ourVolumeChange = true;
    active.volume = clamp(v, 0, 1);
    active.muted = muted;
    ourVolumeChange = false;
    prefs.volume = active.volume;
    prefs.muted = muted;
    prefs.userSetVolume = true;
    savePrefs();
    refreshVolume();
  }
  function toggleMute() {
    if (!active) return;
    const nowMuted = !(active.muted || active.volume === 0);
    setVolume(active.volume === 0 ? 0.5 : active.volume, nowMuted);
    flash(nowMuted ? "Muted" : `Volume ${Math.round(active.volume * 100)}%`);
  }
  function setSpeed(rate) {
    if (!active) return;
    active.playbackRate = rate;
    prefs.speed = rate;
    savePrefs();
    refreshSpeed();
    flash(rate + "×");
  }
  function stepSpeed(dir) {
    if (!active) return;
    const cur = active.playbackRate;
    let i = SPEEDS.findIndex((s) => s >= cur - 0.001);
    if (i === -1) i = SPEEDS.length - 1;
    if (dir > 0 && SPEEDS[i] <= cur + 0.001) i++;
    if (dir < 0) i--;
    setSpeed(SPEEDS[clamp(i, 0, SPEEDS.length - 1)]);
  }
  function toggleFullscreen() {
    if (!active) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      const v = active;
      v.requestFullscreen().then(() => {
        if (!v.controls) { v.controls = true; fsControlsAdded = v; }
      }).catch(() => {});
    }
  }
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && fsControlsAdded) {
      fsControlsAdded.controls = false;
      fsControlsAdded = null;
    }
    refreshFs();
  });

  let toastTimer = null;
  function flash(text) {
    if (!activeRect) return;
    toast.textContent = text;
    toast.style.left = activeRect.left + activeRect.width / 2 + "px";
    toast.style.top = activeRect.top + activeRect.height / 2 + "px";
    toast.classList.add("igvc-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("igvc-show"), 650);
  }

  // ---------- Wire up controls ----------
  playBtn.addEventListener("click", togglePlay);
  backBtn.addEventListener("click", () => seekBy(-5));
  fwdBtn.addEventListener("click", () => seekBy(5));
  muteBtn.addEventListener("click", toggleMute);
  fsBtn.addEventListener("click", toggleFullscreen);
  speedBtn.addEventListener("click", () => stepSpeed(1));
  speedBtn.addEventListener("contextmenu", (e) => { e.preventDefault(); stepSpeed(-1); });
  speedBtn.addEventListener("wheel", (e) => { e.preventDefault(); stepSpeed(e.deltaY < 0 ? 1 : -1); }, { passive: false });

  let wasPlaying = false;
  seek.addEventListener("pointerdown", () => {
    seeking = true;
    wasPlaying = active && !active.paused;
  });
  seek.addEventListener("input", () => {
    const f = seek.value / 1000;
    played.style.width = f * 100 + "%";
    seekToFraction(f);
    if (active) curTime.textContent = fmt(f * active.duration);
  });
  const endSeek = () => {
    if (!seeking) return;
    seeking = false;
    if (wasPlaying && active && active.paused) active.play().catch(() => {});
  };
  seek.addEventListener("pointerup", endSeek);
  seek.addEventListener("change", endSeek);
  window.addEventListener("pointerup", endSeek);

  seekWrap.addEventListener("mousemove", (e) => {
    if (!active || !isFinite(active.duration)) return;
    const r = seekWrap.getBoundingClientRect();
    const f = clamp((e.clientX - r.left) / r.width, 0, 1);
    hoverTime.textContent = fmt(f * active.duration);
    hoverTime.style.left = f * 100 + "%";
  });

  vol.addEventListener("input", () => {
    const v = parseFloat(vol.value);
    setVolume(v, v === 0);
  });
  volWrap.addEventListener("wheel", (e) => {
    if (!active) return;
    e.preventDefault();
    const v = clamp((active.muted ? 0 : active.volume) + (e.deltaY < 0 ? 0.05 : -0.05), 0, 1);
    setVolume(v, v === 0);
  }, { passive: false });

  // ---------- Media events (capture on document; media events don't bubble) ----------
  function applyPrefs(v) {
    if (Math.abs(v.playbackRate - prefs.speed) > 0.001) v.playbackRate = prefs.speed;
    if (prefs.userSetVolume) {
      ourVolumeChange = true;
      v.volume = prefs.volume;
      // Only unmute if the page has had a user gesture, otherwise Firefox blocks autoplay.
      const activated = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (!prefs.muted && activated) v.muted = false;
      else if (prefs.muted) v.muted = true;
      ourVolumeChange = false;
    }
  }

  document.addEventListener("play", (e) => {
    if (e.target instanceof HTMLVideoElement) {
      applyPrefs(e.target);
      pickVideo();
    }
    if (e.target === active) refreshPlay();
  }, true);
  document.addEventListener("pause", (e) => { if (e.target === active) refreshPlay(); }, true);
  document.addEventListener("ratechange", (e) => { if (e.target === active) refreshSpeed(); }, true);
  document.addEventListener("loadedmetadata", (e) => { if (e.target === active) refreshAll(); }, true);
  document.addEventListener("volumechange", (e) => {
    const v = e.target;
    if (v !== active) return;
    // If the user toggled Instagram's own mute button, remember that choice too.
    if (!ourVolumeChange && navigator.userActivation && navigator.userActivation.isActive) {
      prefs.muted = v.muted;
      prefs.volume = v.volume;
      prefs.userSetVolume = true;
      savePrefs();
    }
    refreshVolume();
  }, true);

  // ---------- Keyboard shortcuts ----------
  function isTyping(t) {
    if (!t || !(t instanceof Element)) return false;
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") return !["range", "checkbox", "radio", "button"].includes(t.type);
    return false;
  }

  document.addEventListener("keydown", (e) => {
    if (!active || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
    let handled = true;
    switch (e.key) {
      case "k": case "K": togglePlay(); break;
      case "ArrowLeft": seekBy(-5); break;
      case "ArrowRight": seekBy(5); break;
      case "j": case "J": seekBy(-10); break;
      case "l": case "L": seekBy(10); break;
      case "m": case "M": toggleMute(); break;
      case "f": case "F": toggleFullscreen(); break;
      case ">": stepSpeed(1); break;
      case "<": stepSpeed(-1); break;
      case ",": if (active.paused) active.currentTime = Math.max(0, active.currentTime - 1 / 30); break;
      case ".": if (active.paused) active.currentTime = Math.min(active.duration || 0, active.currentTime + 1 / 30); break;
      default:
        if (/^[0-9]$/.test(e.key)) seekToFraction(parseInt(e.key, 10) / 10);
        else handled = false;
    }
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
      lastMove = performance.now();
    }
  }, true);
})();
