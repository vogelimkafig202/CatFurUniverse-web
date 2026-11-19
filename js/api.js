const BOARD_KEY = "catfur-board";
const PROFILES = [
  { profileId: "p1", baseInterval: 2.2, decayPerLayer: 0.02, fakeOutRate: 0.20, gazeDuration: 1.8 },
  { profileId: "p2", baseInterval: 1.8, decayPerLayer: 0.03, fakeOutRate: 0.22, gazeDuration: 1.5 },
  { profileId: "p3", baseInterval: 2.6, decayPerLayer: 0.015, fakeOutRate: 0.18, gazeDuration: 2.2 },
  { profileId: "p4", baseInterval: 2.0, decayPerLayer: 0.025, fakeOutRate: 0.22, gazeDuration: 1.2 },
  { profileId: "p5", baseInterval: 2.4, decayPerLayer: 0.02, fakeOutRate: 0.18, gazeDuration: 2.0 }
];

function jitter(base, clampRate) {
  const factor = 0.9 + Math.random() * 0.2;
  let value = Math.round(base * factor * 10000) / 10000;
  if (clampRate) {
    if (value < 0) {
      value = 0;
    }
    if (value > 1) {
      value = 1;
    }
  }
  return value;
}

function readBoard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(BOARD_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((row) => row && typeof row.nickname === "string" && Number.isFinite(row.layers));
  } catch (err) {
    return [];
  }
}

function compareEntries(a, b) {
  if (b.layers !== a.layers) {
    return b.layers - a.layers;
  }
  if (!!a.catTreatUsed !== !!b.catTreatUsed) {
    return a.catTreatUsed ? 1 : -1;
  }
  return String(a.time || "").localeCompare(String(b.time || ""));
}

function userOf(nickname) {
  return {
    id: "",
    nickname: nickname,
    createdAt: "",
    token: "local"
  };
}

export async function register(nickname) {
  return userOf(nickname);
}

export async function login(nickname) {
  return userOf(nickname);
}

export async function resume() {
  const name = (localStorage.getItem("nickname") || "").trim();
  if (!name) {
    throw new Error("请重新登录");
  }
  return userOf(name);
}

export async function getTemperament() {
  const profile = PROFILES[Math.floor(Math.random() * PROFILES.length)];
  return {
    profileId: profile.profileId,
    baseInterval: jitter(profile.baseInterval, false),
    decayPerLayer: jitter(profile.decayPerLayer, false),
    fakeOutRate: jitter(profile.fakeOutRate, true),
    gazeDuration: jitter(profile.gazeDuration, false)
  };
}

export async function submitScore(nickname, token, layers, catTreatUsed) {
  const name = String(nickname || "").trim();
  if (!name) {
    return { accepted: false, rank: 0, personalBest: false, reason: "请先登录" };
  }
  const count = Number(layers);
  if (!Number.isFinite(count) || count < 0 || count > 191) {
    return { accepted: false, rank: 0, personalBest: false, reason: "层数必须在 0 到 191 之间" };
  }
  const board = readBoard();
  let best = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i].nickname === name && board[i].layers > best) {
      best = board[i].layers;
    }
  }
  const entry = {
    nickname: name,
    layers: count,
    catTreatUsed: !!catTreatUsed,
    universeCleared: count === 191,
    time: new Date().toISOString()
  };
  board.push(entry);
  board.sort(compareEntries);
  const kept = board.slice(0, 20);
  localStorage.setItem(BOARD_KEY, JSON.stringify(kept));
  const rank = kept.indexOf(entry) + 1;
  return {
    accepted: true,
    rank: rank,
    personalBest: count > best,
    reason: ""
  };
}

export async function getLeaderboard() {
  return readBoard().map((row, index) => {
    return {
      rank: String(index + 1),
      nickname: row.nickname,
      layers: String(row.layers)
    };
  });
}
