let context = null;
let bgm = null;
let bgmWanted = false;
let bgmBroken = false;

function audioContext() {
  if (!context) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    context = new AudioCtx();
  }
  if (context.state === "suspended") {
    context.resume();
  }
  return context;
}

function tone(ctx, type, frequency, duration, volume) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
  return osc;
}

function playClick(ctx) {
  tone(ctx, "square", 800, 0.05, 0.15);
}

const strokeSample = loadSample("audio/grass.ogg");
const meowSample = loadSample("audio/meow.mp3");

function loadSample(src) {
  const audio = new Audio();
  let broken = false;
  audio.preload = "auto";
  audio.src = src;
  audio.addEventListener("error", () => {
    broken = true;
  });
  return {
    play(volume) {
      if (broken) {
        return;
      }
      const node = new Audio(src);
      let pending;
      if (volume > 1) {
        const ctx = audioContext();
        const source = ctx.createMediaElementSource(node);
        const gain = ctx.createGain();
        node.volume = 1;
        gain.gain.value = volume;
        source.connect(gain);
        gain.connect(ctx.destination);
        pending = node.play();
      } else {
        node.volume = volume;
        pending = node.play();
      }
      if (pending && pending.catch) {
        pending.catch(() => {});
      }
    }
  };
}

function playTreat(ctx) {
  const notes = [400, 600, 800];
  const step = 0.1;
  const now = ctx.currentTime;
  for (let i = 0; i < notes.length; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + i * step;
    osc.type = "sine";
    osc.frequency.setValueAtTime(notes[i], start);
    gain.gain.setValueAtTime(0.18, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + step);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + step);
  }
}

function resumeBgm() {
  if (!bgmWanted || bgmBroken || !bgm || !bgm.paused) {
    return;
  }
  const pending = bgm.play();
  if (pending && pending.catch) {
    pending.catch((err) => {
      if (!err || err.name === "NotAllowedError") {
        return;
      }
      bgmBroken = true;
    });
  }
}

function ensureBgm() {
  if (bgm) {
    return bgm;
  }
  bgm = document.createElement("audio");
  bgm.id = "bgm";
  bgm.loop = true;
  bgm.volume = 0.3;
  bgm.preload = "none";
  bgm.src = "audio/bgm.mp3";
  bgm.addEventListener("error", () => {
    bgmBroken = true;
  });
  document.body.appendChild(bgm);
  return bgm;
}

export function playSound(type) {
  try {
    const ctx = audioContext();
    if (type === "click") {
      playClick(ctx);
    } else if (type === "stroke") {
      strokeSample.play(1.44);
    } else if (type === "scratch") {
      meowSample.play(0.8);
    } else if (type === "treat") {
      playTreat(ctx);
    }
    resumeBgm();
  } catch (err) {
    // 没有音频设备时保持静音
  }
}

export function enableBgm() {
  if (bgmBroken) {
    return;
  }
  bgmWanted = true;
  try {
    audioContext();
    ensureBgm();
    resumeBgm();
  } catch (err) {
    bgmBroken = true;
  }
}

export function stopBgm() {
  bgmWanted = false;
  if (bgm) {
    bgm.pause();
  }
}
