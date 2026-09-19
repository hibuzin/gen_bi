import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    printReceipt: () => ipcRenderer.invoke("print-receipt"),
});

window.addEventListener("DOMContentLoaded", () => {
    console.log("Electron Started");
});