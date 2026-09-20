import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";
import treeKill from "tree-kill";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


let mainWindow;
let backendProcess;


const THERMAL_PRINTER_NAME = "RP3160 GOLD(U) 1";

ipcMain.handle("print-receipt", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("Main window is not available");
  }

  console.log("[PRINT] Looking for printer:", THERMAL_PRINTER_NAME);

  // Get printers installed/available to Electron
  const printers =
    await mainWindow.webContents.getPrintersAsync();

  console.log(
    "[PRINT] Available printers:",
    printers.map((printer) => ({
      name: printer.name,
      displayName: printer.displayName,
      status: printer.status,
    }))
  );

  const printer = printers.find(
    (p) =>
      p.name === THERMAL_PRINTER_NAME ||
      p.displayName === THERMAL_PRINTER_NAME
  );

  if (!printer) {
    throw new Error(
      `Printer "${THERMAL_PRINTER_NAME}" not found. ` +
      `Available printers: ${printers
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  console.log("[PRINT] Using printer:", printer.name);

  return new Promise((resolve, reject) => {
    mainWindow.webContents.print(
      {
        silent: true,

        // IMPORTANT:
        // Electron expects the actual system device name.
        deviceName: printer.name,

        printBackground: true,

        margins: {
          marginType: "none",
        },
      },
      (success, failureReason) => {
        if (!success) {
          console.error(
            "[PRINT] Failed:",
            failureReason
          );

          reject(
            new Error(
              failureReason || "Printing failed"
            )
          );

          return;
        }

        console.log(
          "[PRINT] Receipt sent successfully to:",
          printer.name
        );

        resolve({
          success: true,
          printer: printer.name,
        });
      }
    );
  });
});

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

function waitForBackend(port = 5000, host = "127.0.0.1", timeout = 30000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      const socket = new net.Socket();

      socket.setTimeout(1000);

      socket.once("connect", () => {
        socket.destroy();
        console.log(`[Electron] Backend is ready on ${host}:${port}`);
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startTime >= timeout) {
          reject(
            new Error(
              `Backend did not start on ${host}:${port} within ${timeout / 1000} seconds`
            )
          );
        } else {
          setTimeout(check, 300);
        }
      });

      socket.once("timeout", () => {
        socket.destroy();

        if (Date.now() - startTime >= timeout) {
          reject(
            new Error(
              `Backend did not start on ${host}:${port} within ${timeout / 1000} seconds`
            )
          );
        } else {
          setTimeout(check, 300);
        }
      });

      socket.connect(port, host);
    }

    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,

icon: path.join(__dirname, "../build/icon.ico"),
    
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
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

app.whenReady().then(async () => {
  startBackend();

  try {
    await waitForBackend(5000);

    createWindow();
  } catch (error) {
    console.error("[Electron] Backend startup failed:", error);

    createWindow();
  }
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