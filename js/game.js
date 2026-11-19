import { createRenderer } from "./render.js";
import { enableBgm, playSound, stopBgm } from "./audio.js";
import { getLeaderboard, getTemperament, login, resume, submitScore } from "./api.js";

const CAT_LEFT = 124;
const CAT_TOP = 20;
const CAT_RIGHT = 196;
const CAT_BOTTOM = 92;
const STROKE = 24;
const LAYER_CAP = 191;
const POP_MS = 420;
const WARNING_MS = 800;
const HAND_STOP_MS = 120;
const GAZE_HIT_MS = 280;
const TYPE_MS = 30;
const TIP_LINES = [
  "按住鼠标滑动，帮猫猫梳毛吧~",
  "猫猫不耐烦前会有提示哦，小心别被抓住！"
];
const TIP_MS = 50;
const TIP_HOLD_MS = 2500;
const TIP_FADE_MS = 500;
const TREAT_COUNT = 2;
const STAGES = [
  { from: 1, title: "一点点", desc: "掉下来一点点，你觉得猫猫很健康。" },
  { from: 10, title: "一小撮", desc: "已经能从地毯上捏起一小撮，猫猫还没当回事。" },
  { from: 15, title: "一个毛球", desc: "能滚成一个毛球了，沙发缝开始拒绝你的手。" },
  { from: 18, title: "一个枕头", desc: "够塞满一个枕头，猫主子开始警惕。" },
  { from: 22, title: "一床被子", desc: "这些毛够盖一床被子，猫猫决定坐到你手上盯着你。" },
  { from: 25, title: "一辆小汽车", desc: "邻居问你停在楼道里的是不是一辆新车。" },
  { from: 30, title: "一辆重型卡车", desc: "体积开始挡路，出门要侧着身子。" },
  { from: 35, title: "一座小山", desc: "你梳出了一座毛山，邻居开始投诉。" },
  { from: 40, title: "一艘航空母舰", desc: "排水量开始以你梳下的猫毛计算。" },
  { from: 45, title: "一条山脉", desc: "山连成了脉，天气预报开始把你算进去。" },
  { from: 53, title: "一座小岛", desc: "海图上多了一块，海鸥已经在申请居住权。" },
  { from: 60, title: "一颗小行星", desc: "猫毛开始影响局部引力。" },
  { from: 75, title: "一颗行星", desc: "它有了自己的天气，偶尔下毛毛雨。" },
  { from: 95, title: "地球级", desc: "猫毛质量已经与地球相当，天文学家陷入沉默。" },
  { from: 141, title: "超星系团", desc: "引力在排队，猫猫依然只关心下一次回头。" },
  { from: 181, title: "可观测宇宙边缘", desc: "还差最后几梳。" },
  { from: 191, title: "可观测宇宙", desc: "第191梳。猫猫打了个哈欠，宇宙在毛堆里找不到了。" }
];

const WEIGHT_UNITS = [
  [0, "克"],
  [3, "千克"],
  [6, "吨"],
  [10, "万吨"],
  [14, "亿吨"],
  [18, "兆吨"],
  [22, "京吨"],
  [26, "垓吨"],
  [30, "秭吨"],
  [34, "穰吨"],
  [38, "沟吨"],
  [42, "涧吨"],
  [46, "正吨"],
  [50, "载吨"]
];

const canvas = document.querySelector("#game");
const stage = document.querySelector("#stage");
const hudLeft = document.querySelector("#layer-label");
const hudMid = document.querySelector("#weight-label");
const treatIcons = document.querySelectorAll(".treat");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayDetail = document.querySelector("#overlay-detail");
const restartButton = document.querySelector("#restart");
const stageLine = document.querySelector("#stage-copy");
const playerName = document.querySelector("#player-name");
const switchButton = document.querySelector("#switch-account");
const loginPanel = document.querySelector("#login");
const nicknameInput = document.querySelector("#nickname");
const loginStart = document.querySelector("#login-start");
const loginError = document.querySelector("#login-error");
const endPanel = document.querySelector("#end-panel");
const boardPanel = document.querySelector("#board-panel");
const boardList = document.querySelector("#board-list");
const showBoardButton = document.querySelector("#show-board");
const boardBackButton = document.querySelector("#board-back");
const overlaySwitchButton = document.querySelector("#overlay-switch");
const revivePanel = document.querySelector("#revive");
const reviveConfirm = document.querySelector("#revive-confirm");
const startTip = document.querySelector("#start-tip");
const startTipLine1 = document.querySelector("#start-tip-line1");
const startTipLine2 = document.querySelector("#start-tip-line2");
const renderer = createRenderer(canvas);

let layers = 0;
let treatsLeft = TREAT_COUNT;
let isGameStarted = false;
let tipToken = 0;
let tipTimer = 0;
let revivePaused = false;
let reviveAt = 0;
let mood = "idle";
let moodUntil = 0;
let nextEventAt = 0;
let pinned = false;
let over = false;
let popUntil = 0;
let showGrid = false;
let pointerDown = false;
let pointerInside = false;
let strokeDistance = 0;
let axisX = 0;
let axisY = 0;
let needTurn = false;
let turnSlack = 0;
let gazePx = 0;
let lastX = 0;
let lastY = 0;
let lastMoveAt = 0;
let recentMove = 0;
let punishAt = 0;
let warningIsReal = false;
let stageFrom = 0;
let typeText = "";
let typeIndex = 0;
let typeNextAt = 0;
let lastCombAt = 0;
let nickname = "";
let token = "";
let playing = false;
let roundLoading = false;
let loginBusy = false;
let scoreSent = false;
let submitTask = null;
let baseInterval = 2.5;
let decayPerLayer = 0;
let fakeOutRate = 1;
let gazeDuration = 1.5;

function formatMantissa(value) {
  let text;
  if (value >= 100) {
    text = String(Math.round(value));
  } else if (value >= 10) {
    text = value.toFixed(1);
  } else {
    text = value.toFixed(1);
  }
  return text.replace(/\.0$/, "");
}

function formatWeight(count) {
  if (count <= 0) {
    return "0克";
  }
  if (count >= LAYER_CAP) {
    return "宇宙";
  }
  const log10 = (count - 1) * Math.log10(2) - 1;
  let unit = WEIGHT_UNITS[0];
  for (let i = 0; i < WEIGHT_UNITS.length; i++) {
    if (log10 + 1e-9 >= WEIGHT_UNITS[i][0]) {
      unit = WEIGHT_UNITS[i];
    }
  }
  const mantissa = Math.pow(10, log10 - unit[0]);
  return formatMantissa(mantissa) + unit[1];
}

function updateHud() {
  hudLeft.textContent = "梳毛次数: " + layers;
  hudMid.textContent = "毛重: " + formatWeight(layers);
  const used = TREAT_COUNT - treatsLeft;
  treatIcons.forEach((icon, index) => {
    icon.classList.toggle("is-used", index < used);
  });
}

function eventWaitMs() {
  const jitter = 0.85 + Math.random() * 0.3;
  const seconds = Math.max(1.8, baseInterval * jitter);
  return seconds * 1000;
}

function clearTipTimer() {
  if (tipTimer) {
    clearTimeout(tipTimer);
    tipTimer = 0;
  }
}

function showStartTip() {
  tipToken += 1;
  const token = tipToken;
  isGameStarted = false;
  clearTipTimer();
  startTip.classList.remove("is-hide");
  startTip.hidden = false;
  startTipLine1.textContent = "";
  startTipLine2.textContent = "";
  typeStartTip(token, 0, 0);
}

function typeStartTip(token, lineIndex, charIndex) {
  if (token !== tipToken) {
    return;
  }
  if (lineIndex >= TIP_LINES.length) {
    tipTimer = setTimeout(() => fadeStartTip(token), TIP_HOLD_MS);
    return;
  }
  const line = TIP_LINES[lineIndex];
  const chars = Array.from(line);
  const target = lineIndex === 0 ? startTipLine1 : startTipLine2;
  charIndex += 1;
  target.textContent = chars.slice(0, charIndex).join("");
  if (charIndex >= chars.length) {
    if (lineIndex + 1 >= TIP_LINES.length) {
      tipTimer = setTimeout(() => fadeStartTip(token), TIP_HOLD_MS);
      return;
    }
    tipTimer = setTimeout(() => typeStartTip(token, lineIndex + 1, 0), TIP_MS);
    return;
  }
  tipTimer = setTimeout(() => typeStartTip(token, lineIndex, charIndex), TIP_MS);
}

function fadeStartTip(token) {
  if (token !== tipToken) {
    return;
  }
  const finish = (event) => {
    if (event && event.target !== startTip) {
      return;
    }
    if (event && event.propertyName !== "opacity") {
      return;
    }
    startTip.removeEventListener("transitionend", finish);
    finishStartTip(token);
  };
  startTip.addEventListener("transitionend", finish);
  startTip.classList.add("is-hide");
  tipTimer = setTimeout(() => finish(null), TIP_FADE_MS + 80);
}

function finishStartTip(token) {
  if (token !== tipToken || isGameStarted) {
    return;
  }
  clearTipTimer();
  startTip.hidden = true;
  startTip.classList.remove("is-hide");
  if (!playing || over) {
    return;
  }
  isGameStarted = true;
  scheduleNext(performance.now());
}

function scheduleNext(now) {
  nextEventAt = now + eventWaitMs();
}

function triggerEvent(now) {
  gazePx = 0;
  punishAt = 0;
  const fake = Math.min(0.22, Math.max(0, fakeOutRate));
  warningIsReal = Math.random() >= fake;
  mood = "warning";
  moodUntil = now + WARNING_MS;
}

function finishWarning(now) {
  if (warningIsReal) {
    beginGaze(now);
    return;
  }
  mood = "idle";
  gazePx = 0;
  scheduleNext(now);
}

function handIsMoving(now) {
  if (!pointerDown || now - lastMoveAt > HAND_STOP_MS) {
    recentMove = 0;
    return false;
  }
  return recentMove >= 2;
}

function beginGaze(now) {
  mood = "gaze";
  gazePx = 0;
  moodUntil = now + gazeDuration * 1000;
  if (handIsMoving(now)) {
    punishAt = now + GAZE_HIT_MS;
  }
}

function updateMood(now) {
  if (!playing || !isGameStarted || over || pinned || revivePaused || now < popUntil) {
    return;
  }
  if (punishAt > 0 && now >= punishAt) {
    punishAt = 0;
    scratch();
    return;
  }
  if (mood === "warning") {
    if (now >= moodUntil) {
      finishWarning(now);
    }
    return;
  }
  if (mood === "gaze") {
    if (now >= moodUntil) {
      mood = "idle";
      gazePx = 0;
      scheduleNext(now);
    }
    return;
  }
  if (nextEventAt === 0) {
    scheduleNext(now);
  }
  if (now >= nextEventAt) {
    triggerEvent(now);
  }
}

function visualState() {
  if (mood === "warning" || mood === "gaze") {
    return mood;
  }
  if (!over && pointerDown && pointerInside && performance.now() >= popUntil) {
    return "enjoy";
  }
  return "idle";
}

function catScale(now) {
  if (now >= popUntil) {
    return 1;
  }
  const t = 1 - (popUntil - now) / POP_MS;
  return 1 + Math.sin(t * Math.PI) * 0.4;
}

function logicalPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function insideCat(point) {
  return point.x >= CAT_LEFT && point.x < CAT_RIGHT && point.y >= CAT_TOP && point.y < CAT_BOTTOM;
}

function showEndPanel() {
  boardPanel.hidden = true;
  endPanel.hidden = false;
  overlay.hidden = false;
}

function endGame(title, detail) {
  if (over) {
    return;
  }
  over = true;
  playing = false;
  pinned = false;
  mood = "idle";
  pointerDown = false;
  pointerInside = false;
  resetStroke();
  punishAt = 0;
  revivePaused = false;
  reviveAt = 0;
  revivePanel.hidden = true;
  tipToken += 1;
  clearTipTimer();
  startTip.hidden = true;
  startTip.classList.remove("is-hide");
  isGameStarted = false;
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
  showEndPanel();
  scoreSent = true;
  submitTask = submitScore(nickname, token, layers, treatsLeft < TREAT_COUNT, layers >= LAYER_CAP).then((result) => {
    if (result.accepted) {
      const place = result.rank > 0 ? "第 " + result.rank + " 名" : "未进前 20";
      const record = result.personalBest ? "，新纪录" : "";
      overlayDetail.textContent = detail + " " + place + record;
    } else {
      overlayDetail.textContent = detail + " " + (result.reason || "提交失败");
    }
    return result;
  }).catch((err) => {
    overlayDetail.textContent = detail + " " + err.message;
  });
}

function stageFor(count) {
  let found = null;
  for (let i = 0; i < STAGES.length; i++) {
    if (count >= STAGES[i].from) {
      found = STAGES[i];
    }
  }
  return found;
}

function syncStage(now) {
  const stage = stageFor(layers);
  const from = stage ? stage.from : 0;
  if (from === stageFrom) {
    return;
  }
  stageFrom = from;
  typeIndex = 0;
  typeText = stage ? stage.title + " " + stage.desc : "";
  typeNextAt = now;
  stageLine.textContent = "";
}

function updateTypewriter(now) {
  if (revivePaused || typeIndex >= typeText.length || now < typeNextAt) {
    return;
  }
  while (typeIndex < typeText.length && now >= typeNextAt) {
    typeIndex += 1;
    typeNextAt += TYPE_MS;
  }
  stageLine.textContent = typeText.slice(0, typeIndex);
}

function cottonCount(now) {
  let count = 3 + Math.floor(Math.random() * 3);
  if (lastCombAt > 0) {
    const gap = now - lastCombAt;
    if (gap < 400) {
      count = 5;
    } else if (gap < 800) {
      count = Math.max(count, 4);
    }
  }
  return count;
}

function addLayer() {
  if (over || layers >= LAYER_CAP) {
    return;
  }
  const now = performance.now();
  layers += 1;
  playSound("stroke");
  updateHud();
  syncStage(now);
  renderer.burst(cottonCount(now), layers);
  lastCombAt = now;
  if (layers >= LAYER_CAP) {
    endGame("宇宙级收工", "梳了 " + layers + " 下");
  }
}

function scratch() {
  if (over || revivePaused || performance.now() < popUntil) {
    return;
  }
  pinned = false;
  gazePx = 0;
  punishAt = 0;
  pointerDown = false;
  pointerInside = false;
  resetStroke();
  playSound("scratch");
  if (treatsLeft > 0) {
    revivePaused = true;
    reviveAt = performance.now();
    mood = "gaze";
    revivePanel.hidden = false;
    return;
  }
  endGame("被挠了", "梳了 " + layers + " 下");
}

function confirmRevive() {
  if (!revivePaused || treatsLeft <= 0) {
    return;
  }
  const pausedFor = performance.now() - reviveAt;
  treatsLeft -= 1;
  playSound("treat");
  updateHud();
  revivePaused = false;
  reviveAt = 0;
  revivePanel.hidden = true;
  pinned = false;
  mood = "idle";
  moodUntil = 0;
  gazePx = 0;
  punishAt = 0;
  pointerDown = false;
  resetStroke();
  if (typeIndex < typeText.length) {
    typeNextAt += pausedFor;
  }
  const now = performance.now();
  popUntil = now + POP_MS;
  scheduleNext(now + POP_MS);
}

function resetStroke() {
  strokeDistance = 0;
  axisX = 0;
  axisY = 0;
  needTurn = false;
  turnSlack = 0;
}

function applyStroke(dx, dy) {
  const step = Math.hypot(dx, dy);
  if (step === 0) {
    return;
  }
  const ux = dx / step;
  const uy = dy / step;
  if (axisX === 0 && axisY === 0) {
    axisX = ux;
    axisY = uy;
  }
  const dot = ux * axisX + uy * axisY;
  const sameWay = dot > 0.5;
  if (needTurn) {
    if (sameWay) {
      turnSlack = 0;
      return;
    }
    turnSlack += step;
    if (turnSlack < 2) {
      return;
    }
    axisX = ux;
    axisY = uy;
    strokeDistance = turnSlack;
    needTurn = false;
    turnSlack = 0;
  } else if (!sameWay) {
    turnSlack += step;
    if (turnSlack < 2) {
      return;
    }
    axisX = ux;
    axisY = uy;
    strokeDistance = turnSlack;
    turnSlack = 0;
  } else {
    turnSlack = 0;
    strokeDistance += step;
  }
  if (strokeDistance < STROKE) {
    return;
  }
  addLayer();
  strokeDistance = 0;
  needTurn = true;
  turnSlack = 0;
  if (over) {
    resetStroke();
  }
}

function onDown(event) {
  if (event.button !== 0 || !playing || !isGameStarted || over || revivePaused) {
    return;
  }
  event.preventDefault();
  enableBgm();
  const point = logicalPoint(event);
  pointerDown = true;
  pointerInside = insideCat(point);
  lastX = point.x;
  lastY = point.y;
}

function onMove(event) {
  if (!pointerDown || !isGameStarted || over || revivePaused) {
    return;
  }
  const point = logicalPoint(event);
  const dx = point.x - lastX;
  const dy = point.y - lastY;
  const delta = Math.hypot(dx, dy);
  lastX = point.x;
  lastY = point.y;
  pointerInside = insideCat(point);
  if (delta <= 0 || performance.now() < popUntil) {
    return;
  }
  const now = performance.now();
  if (now - lastMoveAt > HAND_STOP_MS) {
    recentMove = 0;
  }
  recentMove += delta;
  lastMoveAt = now;
  if (mood === "gaze") {
    if (punishAt > 0) {
      return;
    }
    gazePx += delta;
    if (gazePx >= 2) {
      scratch();
    }
    return;
  }
  if (!pointerInside) {
    return;
  }
  applyStroke(dx, dy);
}

function onUp() {
  pointerDown = false;
  pointerInside = false;
  resetStroke();
  gazePx = 0;
  recentMove = 0;
}

function forceMood(next) {
  if (revivePaused || (playing && !isGameStarted)) {
    return;
  }
  punishAt = 0;
  if (over) {
    pinned = next !== "idle";
    mood = next === "idle" ? "idle" : next;
    return;
  }
  if (next === "idle") {
    pinned = false;
    mood = "idle";
    scheduleNext(performance.now());
    return;
  }
  pinned = true;
  mood = next;
  gazePx = 0;
}

window.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  if (event.key === "d" || event.key === "D") {
    showGrid = !showGrid;
    stage.classList.toggle("show-grid", showGrid);
    return;
  }
  if (event.key === "1") {
    forceMood("idle");
  } else if (event.key === "2") {
    forceMood("warning");
  } else if (event.key === "3") {
    forceMood("gaze");
  }
});

canvas.addEventListener("mousedown", onDown);
window.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);

function resetRoundState() {
  layers = 0;
  treatsLeft = TREAT_COUNT;
  isGameStarted = false;
  revivePaused = false;
  reviveAt = 0;
  revivePanel.hidden = true;
  mood = "idle";
  moodUntil = 0;
  nextEventAt = 0;
  pinned = false;
  over = false;
  popUntil = 0;
  pointerDown = false;
  pointerInside = false;
  resetStroke();
  gazePx = 0;
  recentMove = 0;
  lastMoveAt = 0;
  punishAt = 0;
  warningIsReal = false;
  lastCombAt = 0;
  scoreSent = false;
  submitTask = null;
  stageFrom = 0;
  typeText = "";
  typeIndex = 0;
  stageLine.textContent = "";
  updateHud();
  syncStage(performance.now());
}

function showPlayer() {
  playerName.textContent = "玩家：" + nickname;
  switchButton.hidden = false;
}

function logout() {
  localStorage.removeItem("nickname");
  localStorage.removeItem("token");
  location.reload();
}

function nicknamePoints(text) {
  return Array.from(text).length;
}

function acceptUser(user, fallbackName) {
  nickname = user.nickname || fallbackName;
  token = user.token || "local";
  localStorage.setItem("nickname", nickname);
  localStorage.setItem("token", token);
  showPlayer();
}

async function beginRound() {
  if (roundLoading) {
    return;
  }
  roundLoading = true;
  playing = false;
  over = true;
  loginPanel.hidden = true;
  showEndPanel();
  overlayTitle.textContent = "读取脾气";
  overlayDetail.textContent = "";
  try {
    const profile = await getTemperament();
    baseInterval = profile.baseInterval;
    decayPerLayer = profile.decayPerLayer;
    fakeOutRate = profile.fakeOutRate;
    gazeDuration = profile.gazeDuration;
  } catch (err) {
    stopBgm();
    overlayTitle.textContent = "无法开始";
    overlayDetail.textContent = err.message;
    roundLoading = false;
    return;
  }
  resetRoundState();
  overlay.hidden = true;
  playing = true;
  showStartTip();
  roundLoading = false;
}

async function startLogin() {
  if (roundLoading || loginBusy) {
    return;
  }
  const name = nicknameInput.value.trim();
  loginError.textContent = "";
  if (nicknamePoints(name) < 1 || nicknamePoints(name) > 12) {
    loginError.textContent = "请输入 1 到 12 个字的名字";
    return;
  }
  enableBgm();
  loginBusy = true;
  try {
    const user = await login(name);
    acceptUser(user, name);
    loginPanel.hidden = true;
    await beginRound();
    if (!playing) {
      stopBgm();
    }
  } catch (err) {
    stopBgm();
    loginError.textContent = err.message;
    loginPanel.hidden = false;
  }
  loginBusy = false;
}

function renderBoard(rows) {
  boardList.textContent = "";
  const head = document.createElement("div");
  head.className = "board-head";
  head.textContent = "";
  ["名次", "昵称", "层数"].forEach((label) => {
    const cell = document.createElement("span");
    cell.textContent = label;
    head.appendChild(cell);
  });
  boardList.appendChild(head);
  if (rows.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "还没有成绩";
    boardList.appendChild(empty);
    return;
  }
  for (let i = 0; i < rows.length; i++) {
    const row = document.createElement("div");
    row.className = "board-row";
    if (rows[i].nickname === nickname) {
      row.classList.add("is-me");
    }
    [rows[i].rank, rows[i].nickname, rows[i].layers].forEach((value) => {
      const cell = document.createElement("span");
      cell.textContent = value;
      row.appendChild(cell);
    });
    boardList.appendChild(row);
  }
}

async function openBoard() {
  boardList.textContent = "读取中";
  endPanel.hidden = true;
  boardPanel.hidden = false;
  overlay.hidden = false;
  if (submitTask) {
    try {
      await submitTask;
    } catch (err) {
      overlayDetail.textContent = err.message;
    }
  }
  try {
    const rows = await getLeaderboard();
    renderBoard(rows);
  } catch (err) {
    boardList.textContent = err.message;
  }
}

restartButton.addEventListener("click", () => {
  playSound("click");
  enableBgm();
  beginRound();
});
showBoardButton.addEventListener("click", () => {
  playSound("click");
  openBoard();
});
boardBackButton.addEventListener("click", () => {
  playSound("click");
  showEndPanel();
});
switchButton.addEventListener("click", () => {
  playSound("click");
  logout();
});
overlaySwitchButton.addEventListener("click", () => {
  playSound("click");
  logout();
});
reviveConfirm.addEventListener("click", () => {
  playSound("click");
  confirmRevive();
});
loginStart.addEventListener("click", () => {
  playSound("click");
  startLogin();
});
nicknameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startLogin();
  }
});

updateHud();

nickname = (localStorage.getItem("nickname") || "").trim();
if (nickname) {
  resume().then((user) => {
    acceptUser(user, nickname);
    beginRound();
  }).catch((err) => {
    if (err.message === "请重新登录") {
      localStorage.removeItem("nickname");
      localStorage.removeItem("token");
      nickname = "";
      token = "";
    }
    playing = false;
    over = true;
    loginPanel.hidden = false;
    loginError.textContent = err.message;
    nicknameInput.focus();
  });
} else {
  playing = false;
  over = true;
  loginPanel.hidden = false;
  nicknameInput.focus();
}

function frame(time) {
  const now = performance.now();
  updateMood(now);
  updateTypewriter(now);
  renderer.draw({
    time: time,
    state: visualState(),
    scale: catScale(now),
    showGrid: showGrid,
    layers: layers
  });
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
