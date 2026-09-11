const pins = [
  { title: "ويكيبيديا", url: "https://ar.wikipedia.org" },
  { title: "يوتيوب", url: "https://www.youtube.com" },
  { title: "إكس", url: "https://x.com" },
  { title: "جوجل", url: "https://www.google.com" },
  { title: "بي بي سي", url: "https://www.bbc.com/arabic" },
  { title: "أرشيف", url: "https://archive.org" },
];

const state = { tabs: [], active: null };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function looksUrl(t) {
  return /^(https?:\/\/)/i.test(t) || /^[\w-]+(\.[\w-]+)+/.test(t);
}

function toUrl(input) {
  const t = input.trim();
  if (!t) return "ufuq:new";
  if (looksUrl(t)) return /^https?:/i.test(t) ? t : "https://" + t;
  return "https://duckduckgo.com/?q=" + encodeURIComponent(t);
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
    show(id);
  }
  renderTabs();
}

function select(id) {
  state.active = id;
  const tab = state.tabs.find((t) => t.id === id);
  document.getElementById("address").value = tab && tab.url.startsWith("http") ? tab.url : "";
  show(id);
  renderTabs();
}

function show(id) {
  const tab = state.tabs.find((t) => t.id === id);
  const start = document.getElementById("start");
  const http = tab && tab.url.startsWith("http");
  start.classList.toggle("hidden", !!http);
  document.querySelectorAll("webview").forEach((w) => {
    w.classList.toggle("show", w.id === "view-" + id && http);
  });
}

function closeTab(id) {
  const i = state.tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const w = document.getElementById("view-" + id);
  if (w) w.remove();
  state.tabs.splice(i, 1);
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

function activeTab() {
  return state.tabs.find((t) => t.id === state.active);
}

function activeView() {
  return document.getElementById("view-" + state.active);
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

const pinBox = document.getElementById("pins");
pins.forEach((p) => {
  const b = document.createElement("button");
  b.className = "pin";
  b.innerHTML = "<i><img src='" + favicon(p.url) + "' alt=''></i>" + p.title;
  b.onclick = () => load(state.active, p.url);
  pinBox.appendChild(b);
});

addTab();

if (window.ufuq && typeof window.ufuq.version === "function") {
  window.ufuq.version().then((v) => {
    const el = document.getElementById("ver");
    if (el) el.textContent = "أفق " + v + " — يحدّث نفسه تلقائياً";
  });
}
