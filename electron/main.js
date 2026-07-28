import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import treeKill from "tree-kill";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let backendProcess;

function startBackend() {
 const backendPath = app.isPackaged
  ? path.join(process.resourcesPath, "backo")
  : path.join(__dirname, "../backo");

  const nodePath = app.isPackaged
    ? path.join(process.resourcesPath, "node-runtime", "node.exe")
    : "node";

  console.log("====================================");
  console.log("Electron Started");
  console.log("Packaged:", app.isPackaged);
  console.log("Backend:", backendPath);
  console.log("Node:", nodePath);
  console.log("====================================");

  backendProcess = spawn(nodePath, ["server.js"], {
    cwd: backendPath,
    shell: false,
  });

  backendProcess.stdout.on("data", (data) => {
    console.log("[Backend]", data.toString());
  });

  backendProcess.stderr.on("data", (data) => {
    console.error("[Backend Error]", data.toString());
  });

  backendProcess.on("close", (code) => {
    console.log("Backend exited:", code);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    const indexPath = app.isPackaged
  ? path.join(app.getAppPath(), "dist", "index.html")
  : path.join(__dirname, "../dist/index.html");

console.log("Loading:", indexPath);

mainWindow.loadFile(indexPath);
  } else {
    console.log("Loading: http://localhost:5173");

    mainWindow.loadURL("http://localhost:5173");

    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    }
  );

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Window Loaded Successfully");
  });

  mainWindow.webContents.on("console-message", (e, level, message) => {
    console.log("[Renderer]", message);
  });
}

app.whenReady().then(() => {
  startBackend();

  setTimeout(() => {
    createWindow();
  }, 3000);
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    treeKill(backendProcess.pid);
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});