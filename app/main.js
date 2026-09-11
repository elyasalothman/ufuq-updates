const { app, BrowserWindow, ipcMain, shell, session } = require("electron");
const fs = require("fs");
const https = require("https");
const path = require("path");

app.setName("أفق");
app.setAppUserModelId("sa.ufuq.browser");

const VERSION = require("./package.json").version;
const FEEDS = [
  "https://cdn.jsdelivr.net/gh/elyasalothman/ufuq-updates@main/latest.json",
  "https://raw.githubusercontent.com/elyasalothman/ufuq-updates/main/latest.json",
];

const AD_HOSTS = [
  "doubleclick.net",
  "googleadservices.com",
  "googlesyndication.com",
  "googletagservices.com",
  "googletagmanager.com",
  "google-analytics.com",
  "amazon-adsystem.com",
  "adsystem.com",
  "scorecardresearch.com",
  "outbrain.com",
  "taboola.com",
  "criteo.com",
  "criteo.net",
  "adnxs.com",
  "adsrvr.org",
  "moatads.com",
  "openx.net",
  "pubmatic.com",
  "rubiconproject.com",
  "casalemedia.com",
  "2mdn.net",
  "advertising.com",
  "quantserve.com",
  "hotjar.com",
  "mgid.com",
  "revcontent.com",
  "popads.net",
  "propellerads.com",
  "exoclick.com",
  "ads.yahoo.com",
  "an.yandex.ru",
  "mc.yandex.ru",
];

const ua = {
  darwin:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  linux:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  win32:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
};
app.userAgentFallback = ua[process.platform] || ua.win32;

let adblockOn = true;

function isAd(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return AD_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

function wireAdblock() {
  const ses = session.fromPartition("persist:ufuq");
  ses.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, cb) => {
    if (adblockOn && isAd(details.url)) cb({ cancel: true });
    else cb({});
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    title: "أفق",
    backgroundColor: "#161310",
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
    },
  });
  win.loadFile(path.join(__dirname, "renderer.html"));
  return win;
}

function cmp(a, b) {
  const pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Ufuq/" + VERSION } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error("HTTP " + res.statusCode));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function broadcast(status) {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) w.webContents.send("update:status", status);
  });
}

async function applyUpdate() {
  broadcast({ kind: "checking", version: VERSION });
  for (const feed of FEEDS) {
    try {
      const data = JSON.parse((await get(feed)).toString("utf8"));
      if (!data || !data.version || cmp(data.version, VERSION) <= 0) continue;
      const base = feed.replace(/latest\.json.*$/, "");
      const dest = __dirname;
      const files = Array.isArray(data.files) ? data.files : [];
      for (const file of files) {
        if (!/^[A-Za-z0-9._-]+$/.test(file)) continue;
        const buf = await get(base + "app/" + file);
        const tmp = path.join(dest, file + ".new");
        fs.writeFileSync(tmp, buf);
        fs.renameSync(tmp, path.join(dest, file));
      }
      broadcast({ kind: "applying", version: data.version });
      return { updated: true, version: data.version };
    } catch {
      continue;
    }
  }
  broadcast({ kind: "current", version: VERSION });
  return { updated: false, version: VERSION };
}

app.whenReady().then(() => {
  wireAdblock();
  const win = createWindow();
  win.webContents.on("did-finish-load", () => {
    setTimeout(async () => {
      const result = await applyUpdate();
      if (result.updated) {
        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 1400);
      }
    }, 800);
  });
});

app.on("window-all-closed", () => app.quit());

ipcMain.on("win:min", (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
ipcMain.on("win:max", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (w.isMaximized()) w.unmaximize();
  else w.maximize();
});
ipcMain.on("win:close", (e) => BrowserWindow.fromWebContents(e.sender)?.close());
ipcMain.handle("open-external", (_e, url) => {
  if (typeof url !== "string") return;
  if (/^https?:/i.test(url) || url.startsWith("microsoft-edge:")) return shell.openExternal(url);
});
ipcMain.handle("app:version", () => VERSION);
ipcMain.handle("app:update", () => applyUpdate());
ipcMain.handle("app:adblock", (_e, on) => {
  adblockOn = !!on;
  return adblockOn;
});
ipcMain.handle("app:google", (e) => {
  const parent = BrowserWindow.fromWebContents(e.sender);
  const win = new BrowserWindow({
    parent: parent || undefined,
    width: 480,
    height: 680,
    title: "جوجل",
    backgroundColor: "#fff",
    webPreferences: {
      partition: "persist:ufuq",
      sandbox: false,
    },
  });
  win.loadURL("https://accounts.google.com/signin/v2/identifier?hl=ar&flowName=GlifWebSignIn");
  return true;
});
