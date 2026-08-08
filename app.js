const ACTS = ["act1", "act2", "act3"];
const ACT_DETAILS = {
  act1: {
    label: "Act 1 - Music Man",
    referencePart: "Piano",
    songShortcuts: [
      { label: "Goodnight, My Someone", time: 0 },
      { label: "Seventy Six Trombones", time: 107 },
      { label: "It's You", time: 154 },
      { label: "Lida Rose", time: 168 },
      { label: "My White Night", time: 245 },
      { label: "Till There Was You", time: 284 },
      { label: "Iowa Stubborn", time: 344 },
      { label: "The Wells Fargo Wagon", time: 350 },
      { label: "Pick-a-little Talk-a-little", time: 390 },
    ],
    parts: [
      { label: "Soloists", group: "non singing parts", fileName: "Act1_Soloists.mp3" },
      { label: "Winds", group: "non singing parts", fileName: "Act1_Winds.mp3" },
      { label: "Percussion", group: "non singing parts", fileName: "Act1_Percussion.mp3" },
      { label: "Piano", group: "non singing parts", fileName: "Act1_Piano.mp3" },
      { label: "Soprano", group: "singing parts", fileName: "Solo_Act1Soprano.mp3" },
      { label: "Alto", group: "singing parts", fileName: "Solo_Act1Alto.mp3" },
      { label: "Tenor", group: "singing parts", fileName: "Solo_Act1Tenor.mp3" },
      { label: "Bass", group: "singing parts", fileName: "Solo_Act1Bass.mp3" },
    ],
  },
  act2: {
    label: "Act 2 - Spelling Bee",
    referencePart: "Piano",
    songShortcuts: [
      { label: "Pandemonium", time: 0 },
      { label: "The Rules", time: 38 },
      { label: "Rona's Moment", time: 73 },
      { label: "Magic Foot", time: 88 },
      { label: "I Speak Six Languages", time: 148 },
      { label: "I'm Not That Smart", time: 195 },
      { label: "Woe Is Me", time: 225 },
      { label: "The I Love You Song", time: 264 },
      { label: "Second", time: 340 },
      { label: "Finale", time: 376 },
      { label: "Goodbye", time: 428 }
    ],
    parts: [
      { label: "Soloists", group: "non singing parts", fileName: "Act2_Soloists.mp3" },
      { label: "Trumpet", group: "non singing parts", fileName: "Act2_Trumpet.mp3" },
      { label: "Clarinet", group: "non singing parts", fileName: "Act2_Clarinet.mp3" },
      { label: "Saxophone", group: "non singing parts", fileName: "Act2_Saxophone.mp3" },
      { label: "Percussion", group: "non singing parts", fileName: "Act2_Percussion.mp3" },
      { label: "Piano", group: "non singing parts", fileName: "Act2_Piano.mp3" },
      { label: "Soprano", group: "singing parts", fileName: "Solo_Act2Soprano.mp3" },
      { label: "Alto", group: "singing parts", fileName: "Solo_Act2Alto.mp3" },
      { label: "Tenor", group: "singing parts", fileName: "Solo_Act2_Tenor.mp3" },
      { label: "Bass", group: "singing parts", fileName: "Solo_Act2Bass.mp3" },
    ],
  },
  act3: {
    label: "Act 3 - Carousel",
    referencePart: "Piano",
    songShortcuts: [
      { label: "TEMP", time: 0 },
      { label: "TEMP", time: 30 },
      { label: "TEMP", time: 60 },
      { label: "TEMP", time: 90 },
      { label: "TEMP", time: 120 },
    ],
    parts: [
      { label: "Soloists", group: "non singing parts" },
      { label: "Trumpet", group: "non singing parts" },
      { label: "Clarinet", group: "non singing parts" },
      { label: "Saxophone", group: "non singing parts" },
      { label: "Percussion", group: "non singing parts" },
      { label: "Piano", group: "non singing parts" },
      { label: "Soprano", group: "singing parts" },
      { label: "Alto", group: "singing parts" },
      { label: "Tenor", group: "singing parts" },
      { label: "Bass", group: "singing parts" },
    ],
  },
};
const PARTS = ACT_DETAILS.act2.parts;

const FILE_EXTENSIONS = ["mp3", "wav", "ogg", "m4a"];
const REST_INDICATOR_DELAY_MS = 200;
const PIANO_DEFAULT_VOLUME = 70;
const PIANO_GAIN_BOOST = 1.2;
const pathExistsCache = new Map();
const panelStates = new Map();

const tabButtons = [...document.querySelectorAll(".tab-button")];
const panelTemplate = document.getElementById("panel-template");
const partRowTemplate = document.getElementById("part-row-template");

let activeAct = ACTS[0];
let audioContext;
let animationFrameId;

function normalizeNameOptions(name) {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const titleCase = trimmed
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
  return [
    ...new Set([
      trimmed,
      lower,
      titleCase,
      trimmed.replace(/\s+\(/g, "_("),
      trimmed.replace(/\s+/g, "_"),
      trimmed.replace(/\s+/g, "-"),
    ]),
  ];
}

function getActParts(act) {
  return ACT_DETAILS[act]?.parts ?? PARTS;
}

function getSingingParts(act) {
  return getActParts(act).filter((part) => part.group === "singing parts");
}

function getActLabel(act) {
  return ACT_DETAILS[act]?.label ?? act;
}

function getReferencePartLabel(act) {
  return ACT_DETAILS[act]?.referencePart ?? "Piano";
}

function getTrackGainBoost(partLabel) {
  return partLabel === "Piano" ? PIANO_GAIN_BOOST : 1;
}

function getTrackGainValue(trackState) {
  const volume = Number(trackState.volumeControl?.value ?? 0) / 100;
  return volume * getTrackGainBoost(trackState.part.label);
}

function getSongShortcuts(act) {
  return ACT_DETAILS[act]?.songShortcuts ?? [];
}

function buildTrackCandidates(act, part) {
  const actNames = normalizeNameOptions(act);
  const groupNames = normalizeNameOptions(part.group);
  const partNames = normalizeNameOptions(part.label);
  const candidates = [];

  if (part.fileName) {
    candidates.push(`music/${act}/${part.group}/${part.fileName}`);
    return candidates;
  }

  for (const actName of actNames) {
    for (const groupName of groupNames) {
      for (const partName of partNames) {
        for (const ext of FILE_EXTENSIONS) {
          candidates.push(`music/${actName}/${groupName}/${partName}.${ext}`);
        }
      }
    }
  }

  return candidates;
}

async function pathExists(path) {
  if (pathExistsCache.has(path)) {
    return pathExistsCache.get(path);
  }

  const existsPromise = fetch(encodeURI(path), { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);

  pathExistsCache.set(path, existsPromise);
  return existsPromise;
}

async function resolveTrackPath(act, part) {
  // If a part explicitly provides a fileName, try that path directly using a GET
  // (some static servers don't respond to HEAD or paths contain spaces).
  if (part.fileName) {
    const direct = `music/${act}/${part.group}/${part.fileName}`;
    try {
      const response = await fetch(encodeURI(direct));
      if (response.ok) {
        return direct;
      }
    } catch {
      // fallthrough to candidate probing below
    }
  }

  const candidates = buildTrackCandidates(act, part);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextConstructor();
  }
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      // Ignore browsers that refuse to resume without a trusted gesture.
    }
  }

  return audioContext;
}

async function decodeAudioBuffer(arrayBuffer) {
  await ensureAudioContext();

  if (audioContext.decodeAudioData.length >= 2) {
    return new Promise((resolve, reject) => {
      audioContext.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  return audioContext.decodeAudioData(arrayBuffer);
}

function ensureTrackGraph(trackState) {
  if (!audioContext) {
    return null;
  }

  if (!trackState.gainNode) {
    trackState.gainNode = audioContext.createGain();
    trackState.gainNode.gain.value = trackState.gainValue ?? 1;
  }

  if (!trackState.analyserNode) {
    trackState.analyserNode = audioContext.createAnalyser();
    trackState.analyserNode.fftSize = 1024;
    trackState.gainNode.connect(trackState.analyserNode);
    trackState.analyserNode.connect(audioContext.destination);
  }

  return trackState.analyserNode;
}

function getAnalyserForAudio(trackState) {
  return trackState?.analyserNode ?? null;
}

function getTrackCurrentTime(trackState, now = audioContext?.currentTime ?? 0) {
  if (!trackState) {
    return 0;
  }

  if (trackState.isPlaying && Number.isFinite(trackState.startedAt)) {
    const elapsed = Math.max(0, now - trackState.startedAt);
    const duration = Number.isFinite(trackState.buffer?.duration) ? trackState.buffer.duration : Number.POSITIVE_INFINITY;
    return Math.min(duration, trackState.offset + elapsed);
  }

  return trackState.offset ?? 0;
}

function setTrackOffset(trackState, timeSeconds) {
  const duration = Number.isFinite(trackState.buffer?.duration) ? trackState.buffer.duration : Number.POSITIVE_INFINITY;
  trackState.offset = Math.max(0, Math.min(duration, timeSeconds));
}

function applyTrackGain(trackState) {
  const gainValue = getTrackGainValue(trackState);
  trackState.gainValue = gainValue;
  if (trackState.gainNode) {
    trackState.gainNode.gain.value = gainValue;
  }
}

function stopTrackPlayback(trackState, preserveOffset = true) {
  if (trackState.isPlaying) {
    trackState.offset = getTrackCurrentTime(trackState);
  }

  if (trackState.sourceNode) {
    try {
      trackState.sourceNode.onended = null;
      trackState.sourceNode.stop();
      trackState.sourceNode.disconnect();
    } catch {
      // Ignore source nodes that have already ended.
    }
  }

  trackState.sourceNode = null;
  trackState.startedAt = 0;
  trackState.isPlaying = false;

  if (!preserveOffset) {
    trackState.offset = 0;
  }
}

function startTrackPlayback(trackState, startTime) {
  if (!audioContext || !trackState.buffer || !trackState.gainNode) {
    return;
  }

  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = trackState.buffer;
  sourceNode.connect(trackState.gainNode);

  const playbackToken = (trackState.playbackToken ?? 0) + 1;
  trackState.playbackToken = playbackToken;
  trackState.sourceNode = sourceNode;
  trackState.startedAt = startTime;
  trackState.isPlaying = true;

  const offset = Math.max(0, Math.min(trackState.offset ?? 0, trackState.buffer.duration));
  sourceNode.onended = () => {
    if (trackState.playbackToken !== playbackToken) {
      return;
    }

    trackState.sourceNode = null;
    trackState.startedAt = 0;
    trackState.isPlaying = false;
    trackState.offset = trackState.buffer?.duration ?? 0;
  };

  sourceNode.start(startTime, offset);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function formatSecondsApprox(seconds) {
  if (!Number.isFinite(seconds) || seconds < 1) {
    return "<1s";
  }

  if (seconds < 60) {
    return `${Math.max(1, Math.round(seconds))}s`;
  }

  const rounded = Math.round(seconds / 5) * 5;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (minutes === 0) {
    return `${remainder}s`;
  }

  if (remainder === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

function getPanelLoadStats(panelState) {
  const total = panelState.rowMap.size;
  let ready = 0;
  let missing = 0;

  for (const row of panelState.rowMap.values()) {
    if (row.audio.buffer) {
      ready += 1;
      continue;
    }

    if (row.audio.missing) {
      missing += 1;
    }
  }

  const pending = Math.max(0, total - ready - missing);
  return { total, ready, missing, pending };
}

function updatePanelLoadUI(panelState) {
  const { total, ready, missing, pending } = getPanelLoadStats(panelState);
  const resolved = ready + missing;
  const progress = total > 0 ? Math.min(100, Math.max(0, (resolved / total) * 100)) : 100;

  panelState.loadProgressFill.style.width = `${progress}%`;

  let statusText;
  if (total === 0) {
    statusText = "No tracks";
  } else if (pending > 0) {
    if (ready === 0) {
      statusText = `Loading ${resolved}/${total} tracks`;
    } else {
      const elapsedMs = Number.isFinite(panelState.loadStartedAt) ? performance.now() - panelState.loadStartedAt : 0;
      const averageMsPerResolved = resolved > 0 ? elapsedMs / resolved : 0;
      const remainingMs = averageMsPerResolved > 0 ? averageMsPerResolved * pending : 0;
      const estimate = remainingMs > 0 ? `about ${formatSecondsApprox(remainingMs / 1000)} left` : "loading…";
      statusText = `${ready}/${total} ready, ${pending} loading, ${estimate}`;
    }
  } else if (missing > 0 && ready === 0) {
    statusText = `No audio files found for ${missing} tracks`;
  } else if (missing > 0) {
    statusText = `${ready}/${total} tracks loaded, ${missing} missing`;
  } else {
    statusText = `Audio ready for ${total} tracks`;
  }

  panelState.loadStatusText.textContent = statusText;
  panelState.loadStatusLabel.textContent = pending > 0 ? "Audio loading" : "Audio ready";
}

function markPanelLoadStarted(panelState) {
  if (!Number.isFinite(panelState.loadStartedAt)) {
    panelState.loadStartedAt = performance.now();
  }

  panelState.isPreloading = true;
  updatePanelLoadUI(panelState);
}

function markPanelLoadFinished(panelState) {
  panelState.isPreloading = false;
  updatePanelLoadUI(panelState);
}

function getReferenceRow(panelState) {
  return panelState.rowMap.get(getReferencePartLabel(panelState.act)) ?? [...panelState.rowMap.values()][0] ?? null;
}

function waitForAudioMetadata(audio) {
  if (audio.buffer) {
    return Promise.resolve();
  }

  return audio.loadPromise ?? Promise.resolve();
}

function updateTimelineUI(panelState) {
  const referenceRow = getReferenceRow(panelState);
  if (!referenceRow) {
    return;
  }

  const { audio } = referenceRow;
  const { timelineSlider, timelineTime } = panelState;
  const duration = Number.isFinite(audio.buffer?.duration) && audio.buffer.duration > 0 ? audio.buffer.duration : 0;
  const currentTime = getTrackCurrentTime(audio);

  if (duration > 0) {
    timelineSlider.value = String(Math.min(100, Math.max(0, (currentTime / duration) * 100)));
  } else {
    timelineSlider.value = "0";
  }

  timelineTime.textContent = formatTime(currentTime);
}

async function seekPanel(panelState, timeSeconds) {
  const targetTime = Math.max(0, timeSeconds);
  await ensurePanelAudioSources(panelState);

  const loadedRows = [...panelState.rowMap.values()].filter((row) => row.audio.buffer);
  await Promise.all(loadedRows.map((row) => waitForAudioMetadata(row.audio)));

  if (panelState.isPlaying) {
    await restartPanelPlayback(panelState, targetTime);
    return;
  }

  for (const row of loadedRows) {
    setTrackOffset(row.audio, targetTime);
  }

  updateTimelineUI(panelState);
}

function updateSingIndicator() {
  const activeState = panelStates.get(activeAct);
  if (!activeState) {
    return;
  }

  const { indicator, voiceSelect, rowMap } = activeState;
  const voiceRow = rowMap.get(voiceSelect.value);

  let isSinging = false;
  if (voiceRow && voiceRow.audio.isPlaying && voiceRow.audio.gainValue > 0) {
    const analyser = getAnalyserForAudio(voiceRow.audio);
    if (analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (const sample of data) {
        const centered = sample - 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      isSinging = rms > 5;
    }
  }

  if (isSinging) {
    if (activeState.restIndicatorTimeoutId) {
      clearTimeout(activeState.restIndicatorTimeoutId);
      activeState.restIndicatorTimeoutId = null;
    }
    activeState.indicatorIsSinging = true;
    indicator.classList.toggle("sing", true);
    indicator.classList.toggle("rest", false);
    indicator.textContent = "Your part- Sing now";
  } else if (activeState.indicatorIsSinging && !activeState.restIndicatorTimeoutId) {
    activeState.restIndicatorTimeoutId = window.setTimeout(() => {
      activeState.restIndicatorTimeoutId = null;
      activeState.indicatorIsSinging = false;
      indicator.classList.toggle("sing", false);
      indicator.classList.toggle("rest", true);
      indicator.textContent = "Rests- don't sing";
    }, REST_INDICATOR_DELAY_MS);
  } else if (!activeState.indicatorIsSinging) {
    indicator.classList.toggle("sing", false);
    indicator.classList.toggle("rest", true);
    indicator.textContent = "Rests- don't sing";
  }

  updateTimelineUI(activeState);

  if (activeState.isPlaying) {
    animationFrameId = requestAnimationFrame(updateSingIndicator);
  } else {
    stopIndicatorLoop();
  }
}

function stopIndicatorLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function pausePanelAudio(panelState) {
  if (panelState.restIndicatorTimeoutId) {
    clearTimeout(panelState.restIndicatorTimeoutId);
    panelState.restIndicatorTimeoutId = null;
  }
  panelState.indicatorIsSinging = false;
  for (const row of panelState.rowMap.values()) {
    stopTrackPlayback(row.audio);
  }
  panelState.playButton.textContent = "Play";
  panelState.isPlaying = false;
}

function pauseAllPanelsExcept(allowedAct) {
  for (const [act, panelState] of panelStates.entries()) {
    if (act !== allowedAct) {
      pausePanelAudio(panelState);
    }
  }
}

function syncVoiceVolumes(panelState) {
  const selectedRow = panelState.rowMap.get(panelState.voiceSelect.value);
  if (!selectedRow) {
    return;
  }

  for (const [label, row] of panelState.rowMap.entries()) {
    const isSelected = label === panelState.voiceSelect.value;
    const isSingingPart = row.part.group === "singing parts";
    let volume = 35;

    if (label === "Piano") {
      volume = PIANO_DEFAULT_VOLUME;
    } else if (isSingingPart) {
      volume = isSelected ? 100 : 0;
    }

    row.volume.value = String(volume);
    row.audio.volumeControl = row.volume;
    applyTrackGain(row.audio);
  }
}

async function ensurePanelAudioSources(panelState) {
  await ensureAudioContext();
  markPanelLoadStarted(panelState);

  const requests = [...panelState.rowMap.values()].map(async (row) => {
    if (row.audio.buffer) {
      row.audio.missing = false;
      return;
    }
    if (row.audio.loadPromise) {
      await row.audio.loadPromise;
      return;
    }

    const path = await resolveTrackPath(panelState.act, row.part);
    if (path) {
      row.audio.path = path;
      const loadPromise = fetch(path)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => decodeAudioBuffer(arrayBuffer))
        .then((buffer) => {
          row.audio.buffer = buffer;
          row.audio.missing = false;
          setTrackOffset(row.audio, row.audio.offset ?? 0);
          updatePanelLoadUI(panelState);
          return buffer;
        });
      row.audio.loadPromise = loadPromise.catch((error) => {
        row.audio.loadPromise = null;
        row.audio.missing = true;
        updatePanelLoadUI(panelState);
        return null;
      });
      await row.audio.loadPromise;
    } else {
      row.audio.missing = true;
      updatePanelLoadUI(panelState);
    }
  });

  await Promise.all(requests);
  markPanelLoadFinished(panelState);
}

async function restartPanelPlayback(panelState, targetTime) {
  await ensureAudioContext();
  await ensurePanelAudioSources(panelState);

  const startTime = audioContext.currentTime + 0.1;
  const requestedTime = Math.max(0, targetTime);

  for (const row of panelState.rowMap.values()) {
    stopTrackPlayback(row.audio);
    if (!row.toggle.checked || !row.audio.buffer) {
      continue;
    }

    setTrackOffset(row.audio, requestedTime);
    ensureTrackGraph(row.audio);
    startTrackPlayback(row.audio, startTime);
  }

  panelState.playButton.textContent = "Pause";
  panelState.isPlaying = true;

  stopIndicatorLoop();
  updateSingIndicator();
}

async function playPanel(panelState) {
  pauseAllPanelsExcept(panelState.act);
  const referenceRow = getReferenceRow(panelState);
  const currentTime = referenceRow ? getTrackCurrentTime(referenceRow.audio) : 0;
  await restartPanelPlayback(panelState, currentTime);
}

function switchTab(nextAct) {
  activeAct = nextAct;

  tabButtons.forEach((button) => {
    const isActive = button.dataset.act === nextAct;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isActive = panel.dataset.panel === nextAct;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  for (const panelState of panelStates.values()) {
    pausePanelAudio(panelState);
  }

  stopIndicatorLoop();
  updateSingIndicator();
}

function createPanel(act) {
  const panelContainer = document.querySelector(`[data-panel="${act}"]`);
  const panelContent = panelTemplate.content.firstElementChild.cloneNode(true);
  panelContainer.append(panelContent);

  const voiceSelect = panelContainer.querySelector(".voice-select");
  const playButton = panelContainer.querySelector(".play-toggle");
  const loadStatus = panelContainer.querySelector(".load-status");
  const loadStatusLabel = panelContainer.querySelector(".load-status-label");
  const loadStatusText = panelContainer.querySelector(".load-status-text");
  const loadProgressFill = panelContainer.querySelector(".load-progress-fill");
  const partsList = panelContainer.querySelector(".parts-list");
  const indicator = panelContainer.querySelector(".sing-indicator");
  const timelineSlider = panelContainer.querySelector(".timeline-slider");
  const timelineTime = panelContainer.querySelector(".timeline-time");
  const songLinks = panelContainer.querySelector(".song-links");
  const songLinksSection = panelContainer.querySelector(".song-links-section");

  const rowMap = new Map();

  voiceSelect.replaceChildren();
  for (const part of getSingingParts(act)) {
    const option = document.createElement("option");
    option.value = part.label;
    option.textContent = part.label;
    voiceSelect.append(option);
  }

  for (const part of getActParts(act)) {
    const row = partRowTemplate.content.firstElementChild.cloneNode(true);
    const name = row.querySelector(".part-name");
    const toggle = row.querySelector(".part-toggle");
    const volume = row.querySelector(".part-volume");
    const audio = {
      part,
      volumeControl: volume,
      buffer: null,
      loadPromise: null,
      path: "",
      offset: 0,
      startedAt: 0,
      sourceNode: null,
      gainNode: null,
      analyserNode: null,
      playbackToken: 0,
      isPlaying: false,
      gainValue: 1,
      missing: false,
    };

    name.textContent = part.label;
    volume.setAttribute("aria-label", `${part.label} volume`);
    toggle.setAttribute("aria-label", `${part.label} toggle`);

    volume.addEventListener("input", () => {
      audio.volumeControl = volume;
      applyTrackGain(audio);
    });

    toggle.addEventListener("change", async () => {
      if (toggle.checked && !audio.buffer) {
        await ensurePanelAudioSources(panelState);
      }

      if (!panelState.isPlaying) {
        updateTimelineUI(panelState);
        return;
      }

      const referenceRow = getReferenceRow(panelState);
      const referenceTime = referenceRow ? getTrackCurrentTime(referenceRow.audio) : 0;
      await restartPanelPlayback(panelState, referenceTime);
    });

    partsList.append(row);
    rowMap.set(part.label, { part, audio, toggle, volume });
  }

  songLinks.replaceChildren();
  const songShortcuts = getSongShortcuts(act);
  if (songShortcuts.length === 0) {
    songLinksSection.hidden = true;
  } else {
    songLinksSection.hidden = false;
    for (const shortcut of songShortcuts) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "song-link";
      button.textContent = `${shortcut.label} - ${formatTime(shortcut.time)}`;
      button.dataset.time = String(shortcut.time);
      button.addEventListener("click", async () => {
        await seekPanel(panelState, shortcut.time);
      });
      songLinks.append(button);
    }
  }

  const panelState = {
    act,
    voiceSelect,
    playButton,
    loadStatus,
    loadStatusLabel,
    loadStatusText,
    loadProgressFill,
    indicator,
    timelineSlider,
    timelineTime,
    rowMap,
    isPlaying: false,
    indicatorIsSinging: false,
    restIndicatorTimeoutId: null,
    isPreloading: false,
    loadStartedAt: Number.NaN,
  };

  timelineSlider.addEventListener("input", async () => {
    const referenceRow = getReferenceRow(panelState);
    if (!referenceRow) {
      return;
    }

    await ensurePanelAudioSources(panelState);
    const duration = referenceRow.audio.buffer?.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const targetTime = (Number(timelineSlider.value) / 100) * duration;
    if (panelState.isPlaying) {
      await restartPanelPlayback(panelState, targetTime);
      return;
    }

    for (const row of panelState.rowMap.values()) {
      setTrackOffset(row.audio, targetTime);
    }
    timelineTime.textContent = formatTime(targetTime);
  });

  voiceSelect.addEventListener("change", () => {
    const selectedRow = rowMap.get(voiceSelect.value);
    if (selectedRow && !selectedRow.toggle.checked) {
      selectedRow.toggle.checked = true;
    }
    syncVoiceVolumes(panelState);
    updateSingIndicator();
  });

  playButton.addEventListener("click", async () => {
    if (!panelState.isPlaying) {
      await playPanel(panelState);
    } else {
      pausePanelAudio(panelState);
      stopIndicatorLoop();
      updateSingIndicator();
    }
  });

  panelStates.set(act, panelState);

  syncVoiceVolumes(panelState);
  updatePanelLoadUI(panelState);
}

for (const act of ACTS) {
  createPanel(act);
}

for (const button of tabButtons) {
  button.textContent = getActLabel(button.dataset.act);
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    switchTab(button.dataset.act);
  });
}

updateSingIndicator();

window.setTimeout(() => {
  for (const panelState of panelStates.values()) {
    void ensurePanelAudioSources(panelState);
  }
}, 0);
