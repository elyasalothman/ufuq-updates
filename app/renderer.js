const ENGINES = [
  { id: "google", name: "جوجل", search: (q) => "https://www.google.com/search?q=" + encodeURIComponent(q) },
  { id: "ddg", name: "داك داك غو", search: (q) => "https://duckduckgo.com/?q=" + encodeURIComponent(q) },
  { id: "bing", name: "بينغ", search: (q) => "https://www.bing.com/search?q=" + encodeURIComponent(q) },
  { id: "yandex", name: "ياندكس", search: (q) => "https://yandex.com/search/?text=" + encodeURIComponent(q) },
  { id: "brave", name: "بريف", search: (q) => "https://search.brave.com/search?q=" + encodeURIComponent(q) },
];

const pins = [
  { title: "ويكيبيديا", url: "https://ar.wikipedia.org" },
  { title: "يوتيوب", url: "https://www.youtube.com" },
  { title: "إكس", url: "https://x.com" },
  { title: "جوجل", url: "https://www.google.com" },
  { title: "بي بي سي", url: "https://www.bbc.com/arabic" },
  { title: "أرشيف", url: "https://archive.org" },
];

const prefs = JSON.parse(localStorage.getItem("ufuq-prefs") || "{}");
const state = {
  tabs: [],
  active: null,
  split: null,
  engine: prefs.engine || "google",
  adblock: prefs.adblock !== false,
};

function savePrefs() {
  localStorage.setItem("ufuq-prefs", JSON.stringify({ engine: state.engine, adblock: state.adblock }));
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function looksUrl(t) {
  return /^(https?:\/\/)/i.test(t) || /^[\w-]+(\.[\w-]+)+/.test(t);
}

function engine() {
  return ENGINES.find((e) => e.id === state.engine) || ENGINES[0];
}

function toUrl(input) {
  const t = input.trim();
  if (!t) return "ufuq:new";
  if (looksUrl(t)) return /^https?:/i.test(t) ? t : "https://" + t;
  return engine().search(t);
}

function host(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function favicon(url) {
  const h = host(url);
  return h ? "https://icons.duckduckgo.com/ip3/" + h + ".ico" : "";
}

function addTab(url) {
  const id = uid();
  const tab = { id, url: url || "ufuq:new", title: "تبويب جديد" };
  state.tabs.push(tab);
  if (url && url.startsWith("http")) createView(tab);
  select(id);
  if (url && url.startsWith("http")) load(id, url);
  return tab;
}

function createView(tab) {
  if (document.getElementById("view-" + tab.id)) return;
  const w = document.createElement("webview");
  w.id = "view-" + tab.id;
  w.setAttribute("partition", "persist:ufuq");
  w.setAttribute("allowpopups", "true");
  w.addEventListener("page-title-updated", (e) => {
    tab.title = e.title;
    renderTabs();
  });
  w.addEventListener("did-navigate", (e) => {
    tab.url = e.url;
    if (state.active === tab.id) document.getElementById("address").value = e.url;
  });
  w.addEventListener("did-navigate-in-page", (e) => {
    tab.url = e.url;
    if (state.active === tab.id) document.getElementById("address").value = e.url;
  });
  w.addEventListener("new-window", (e) => {
    e.preventDefault();
    addTab(e.url);
  });
  document.getElementById("views").appendChild(w);
}

function load(id, url) {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  tab.url = url;
  if (url.startsWith("http")) {
    createView(tab);
    const w = document.getElementById("view-" + id);
    w.src = url;
  }
  if (state.active === id) {
    document.getElementById("address").value = url.startsWith("http") ? url : "";
    show();
  }
  renderTabs();
}

function select(id) {
  state.active = id;
  const tab = state.tabs.find((t) => t.id === id);
  document.getElementById("address").value = tab && tab.url.startsWith("http") ? tab.url : "";
  show();
  renderTabs();
}

function show() {
  const start = document.getElementById("start");
  const views = document.getElementById("views");
  const active = state.tabs.find((t) => t.id === state.active);
  const http = active && active.url.startsWith("http");
  const splitTab = state.split && state.tabs.find((t) => t.id === state.split);
  start.classList.toggle("hidden", !!(http || (splitTab && splitTab.url.startsWith("http"))));
  views.classList.toggle("split", !!(state.split && state.split !== state.active));
  document.querySelectorAll("webview").forEach((w) => {
    const id = w.id.replace("view-", "");
    const showLeft = id === state.active && http;
    const showRight = state.split && id === state.split && splitTab && splitTab.url.startsWith("http");
    w.classList.toggle("show", !!(showLeft || showRight));
  });
  document.getElementById("splitState").textContent = state.split ? "يعمل" : "متوقف";
}

function closeTab(id) {
  const i = state.tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const w = document.getElementById("view-" + id);
  if (w) w.remove();
  state.tabs.splice(i, 1);
  if (state.split === id) state.split = null;
  if (!state.tabs.length) addTab();
  else if (state.active === id) select(state.tabs[Math.max(0, i - 1)].id);
  else renderTabs();
}

function renderTabs() {
  const el = document.getElementById("tabs");
  el.innerHTML = "";
  state.tabs.forEach((tab) => {
    const b = document.createElement("button");
    b.className = "tab" + (tab.id === state.active ? " active" : "");
    b.onclick = () => select(tab.id);
    const img = tab.url.startsWith("http")
      ? '<img width="14" height="14" src="' + favicon(tab.url) + '" alt="">'
      : "";
    b.innerHTML = img + "<span>" + (tab.title || host(tab.url) || "تبويب جديد") + "</span>";
    const x = document.createElement("button");
    x.className = "ghost";
    x.style.width = "18px";
    x.style.height = "18px";
    x.textContent = "×";
    x.onclick = (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    };
    b.appendChild(x);
    el.appendChild(b);
  });
}

function activeView() {
  return document.getElementById("view-" + state.active);
}

function toggleSplit() {
  if (state.split) {
    state.split = null;
  } else {
    const other = state.tabs.find((t) => t.id !== state.active);
    if (other) state.split = other.id;
    else state.split = addTab().id;
  }
  show();
}

function renderEngines() {
  const box = document.getElementById("engines");
  box.innerHTML = "";
  ENGINES.forEach((e) => {
    const b = document.createElement("button");
    b.textContent = e.name;
    b.className = e.id === state.engine ? "on" : "";
    b.onclick = () => {
      state.engine = e.id;
      savePrefs();
      renderEngines();
    };
    box.appendChild(b);
  });
}

function setSettings(open) {
  document.getElementById("settings").classList.toggle("hidden", !open);
}

function syncAd() {
  document.getElementById("adState").textContent = state.adblock ? "يعمل" : "متوقف";
  if (window.ufuq && window.ufuq.setAdblock) window.ufuq.setAdblock(state.adblock);
}

document.getElementById("newTab").onclick = () => addTab();
document.getElementById("min").onclick = () => window.ufuq.min();
document.getElementById("max").onclick = () => window.ufuq.max();
document.getElementById("close").onclick = () => window.ufuq.close();
document.getElementById("home").onclick = () => load(state.active, "ufuq:new");
document.getElementById("back").onclick = () => {
  const w = activeView();
  if (w && w.canGoBack()) w.goBack();
};
document.getElementById("forward").onclick = () => {
  const w = activeView();
  if (w && w.canGoForward()) w.goForward();
};
document.getElementById("reload").onclick = () => {
  const w = activeView();
  if (w) w.reload();
};
document.getElementById("omni").onsubmit = (e) => {
  e.preventDefault();
  load(state.active, toUrl(document.getElementById("address").value));
};
document.getElementById("startForm").onsubmit = (e) => {
  e.preventDefault();
  load(state.active, toUrl(document.getElementById("startQ").value));
};
document.getElementById("setBtn").onclick = () => setSettings(true);
document.getElementById("setClose").onclick = () => setSettings(false);
document.getElementById("splitBtn").onclick = toggleSplit;
document.getElementById("splitToggle").onclick = toggleSplit;
document.getElementById("adBtn").onclick = () => {
  state.adblock = !state.adblock;
  savePrefs();
  syncAd();
};
document.getElementById("adToggle").onclick = () => {
  state.adblock = !state.adblock;
  savePrefs();
  syncAd();
};
document.getElementById("googleBtn").onclick = () => {
  if (window.ufuq && window.ufuq.google) window.ufuq.google();
};

const pinBox = document.getElementById("pins");
pins.forEach((p) => {
  const b = document.createElement("button");
  b.className = "pin";
  b.innerHTML = "<i><img src='" + favicon(p.url) + "' alt=''></i>" + p.title;
  b.onclick = () => load(state.active, p.url);
  pinBox.appendChild(b);
});

renderEngines();
syncAd();
addTab();

function toast(text) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), 4000);
}

function showUpdate(status) {
  const line = document.getElementById("updStatus");
  const verSet = document.getElementById("verSet");
  const ver = document.getElementById("ver");
  const v = (status && status.version) || "";
  if (verSet) verSet.textContent = "النسخة الحالية " + (v || "1.2.1");
  if (ver && v) ver.textContent = "أفق " + v;
  let msg = "جاري التحقق…";
  if (status && status.kind === "current") msg = "أفق محدّث — هذه أحدث نسخة";
  if (status && status.kind === "available") msg = "يتوفر إصدار " + status.version;
  if (status && status.kind === "applying") msg = "يتم تطبيق التحديث…";
  if (status && status.kind === "error") msg = "تعذر التحقق الآن";
  if (line) line.textContent = msg;
  toast(msg);
}

async function runUpdate() {
  showUpdate({ kind: "checking", version: "" });
  if (!window.ufuq || !window.ufuq.update) {
    showUpdate({ kind: "current", version: "1.2.1" });
    return;
  }
  const result = await window.ufuq.update();
  if (result && result.updated) showUpdate({ kind: "applying", version: result.version });
  else showUpdate({ kind: "current", version: (result && result.version) || "1.2.1" });
}

document.getElementById("checkUpdate").onclick = () => runUpdate();
document.getElementById("updateStart").onclick = () => {
  setSettings(true);
  runUpdate();
};

if (window.ufuq && window.ufuq.onUpdate) window.ufuq.onUpdate(showUpdate);
if (window.ufuq && typeof window.ufuq.version === "function") {
  window.ufuq.version().then((v) => {
    const el = document.getElementById("ver");
    if (el) el.textContent = "أفق " + v;
    const vs = document.getElementById("verSet");
    if (vs) vs.textContent = "النسخة الحالية " + v;
  });
}

toast("جاري التحقق من التحديث…");

