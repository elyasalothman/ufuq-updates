const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ufuq", {
  min: () => ipcRenderer.send("win:min"),
  max: () => ipcRenderer.send("win:max"),
  close: () => ipcRenderer.send("win:close"),
  version: () => ipcRenderer.invoke("app:version"),
  update: () => ipcRenderer.invoke("app:update"),
  google: () => ipcRenderer.invoke("app:google"),
  setAdblock: (on) => ipcRenderer.invoke("app:adblock", on),
  onUpdate: (cb) => ipcRenderer.on("update:status", (_e, status) => cb(status)),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
});
