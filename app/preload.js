const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ufuq", {
  min: () => ipcRenderer.send("win:min"),
  max: () => ipcRenderer.send("win:max"),
  close: () => ipcRenderer.send("win:close"),
  version: () => ipcRenderer.invoke("app:version"),
  update: () => ipcRenderer.invoke("app:update"),
});
