const ACTS = ["act1", "act2", "act3"];
const PARTS = [
  { label: "Soloists", group: "non singing parts" },
  { label: "Trumpet", group: "non singing parts" },
  { label: "Clarinet", group: "non singing parts" },
  { label: "Saxophone", group: "non singing parts" },
  { label: "Percussion", group: "non singing parts" },
  { label: "Piano", group: "non singing parts" },
  { label: "Soprano", group: "singing parts" },
  { label: "Tenor", group: "singing parts" },
  { label: "Alto", group: "singing parts" },
  { label: "Bass", group: "singing parts" },
];

const FILE_EXTENSIONS = ["mp3", "wav", "ogg", "m4a"];
const pathExistsCache = new Map();
const panelStates = new Map();

const tabButtons = [...document.querySelectorAll(".tab-button")];
const panelTemplate = document.getElementById("panel-template");
const partRowTemplate = document.getElementById("part-row-template");

let activeAct = ACTS[0];
let audioContext;
let animationFrameId;
const analysisNodes = new WeakMap();

function normalizeNameOptions(name) {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const titleCase = trimmed
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
  return [...new Set([trimmed, lower, titleCase, trimmed.replace(/\s+/g, "_"), trimmed.replace(/\s+/g, "-")])];
}

function buildTrackCandidates(act, part) {
  const actNames = normalizeNameOptions(act);
  const groupNames = normalizeNameOptions(part.group);
  const partNames = normalizeNameOptions(part.label);
  const candidates = [];

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

  const existsPromise = fetch(path, { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);

  pathExistsCache.set(path, existsPromise);
  return existsPromise;
}

async function resolveTrackPath(act, part) {
  const candidates = buildTrackCandidates(act, part);
  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return "";
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
}

function getAnalyserForAudio(audioElement) {
  if (!audioContext) {
    return null;
  }

  if (analysisNodes.has(audioElement)) {
    return analysisNodes.get(audioElement);
  }

  const source = audioContext.createMediaElementSource(audioElement);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  analysisNodes.set(audioElement, analyser);
  return analyser;
}

function updateSingIndicator() {
  const activeState = panelStates.get(activeAct);
  if (!activeState) {
    return;
  }

  const { indicator, voiceSelect, rowMap } = activeState;
  const voiceRow = rowMap.get(voiceSelect.value);

  let isSinging = false;
  if (voiceRow && !voiceRow.audio.paused && !voiceRow.audio.muted && voiceRow.audio.volume > 0) {
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

  indicator.classList.toggle("sing", isSinging);
  indicator.classList.toggle("rest", !isSinging);
  indicator.textContent = isSinging ? "Your part- Sing now" : "Rests- don't sing";

  animationFrameId = requestAnimationFrame(updateSingIndicator);
}

function stopIndicatorLoop() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function pausePanelAudio(panelState) {
  for (const row of panelState.rowMap.values()) {
    row.audio.pause();
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

async function ensurePanelAudioSources(panelState) {
  const requests = [...panelState.rowMap.values()].map(async (row) => {
    if (row.audio.src) {
      return;
    }
    const path = await resolveTrackPath(panelState.act, row.part);
    if (path) {
      row.audio.src = path;
      row.audio.load();
    }
  });

  await Promise.all(requests);
}

async function playPanel(panelState) {
  ensureAudioContext();
  pauseAllPanelsExcept(panelState.act);
  await ensurePanelAudioSources(panelState);

  const playableRows = [...panelState.rowMap.values()].filter((row) => row.toggle.checked && row.audio.src);

  await Promise.all(
    playableRows.map((row) =>
      row.audio.play().catch(() => {
        /* ignored to keep other tracks playable */
      })
    )
  );

  panelState.playButton.textContent = "Pause";
  panelState.isPlaying = true;

  stopIndicatorLoop();
  updateSingIndicator();
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
  const partsList = panelContainer.querySelector(".parts-list");
  const indicator = panelContainer.querySelector(".sing-indicator");

  const rowMap = new Map();

  for (const part of PARTS) {
    const row = partRowTemplate.content.firstElementChild.cloneNode(true);
    const name = row.querySelector(".part-name");
    const toggle = row.querySelector(".part-toggle");
    const volume = row.querySelector(".part-volume");
    const audio = new Audio();
    audio.preload = "metadata";

    name.textContent = part.label;
    volume.setAttribute("aria-label", `${part.label} volume`);
    toggle.setAttribute("aria-label", `${part.label} toggle`);

    volume.addEventListener("input", () => {
      audio.volume = Number(volume.value) / 100;
    });

    toggle.addEventListener("change", async () => {
      if (!panelState.isPlaying) {
        return;
      }

      if (toggle.checked) {
        if (!audio.src) {
          const path = await resolveTrackPath(panelState.act, part);
          if (path) {
            audio.src = path;
            audio.load();
          }
        }
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });

    partsList.append(row);
    rowMap.set(part.label, { part, audio, toggle, volume });
  }

  const panelState = {
    act,
    voiceSelect,
    playButton,
    indicator,
    rowMap,
    isPlaying: false,
  };

  voiceSelect.addEventListener("change", () => {
    const selectedRow = rowMap.get(voiceSelect.value);
    if (selectedRow && !selectedRow.toggle.checked) {
      selectedRow.toggle.checked = true;
    }
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
}

for (const act of ACTS) {
  createPanel(act);
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    switchTab(button.dataset.act);
  });
}

updateSingIndicator();
