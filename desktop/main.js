const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Registrar el esquema 'app' como privilegiado (requerido para APIs web modernas como fetch y localStorage)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png')
  });

  // Ocultar la barra de menú estándar de Electron para mayor estética nativa
  mainWindow.removeMenu();

  // Cargar la app usando nuestro protocolo personalizado
  mainWindow.loadURL('app://localhost/');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Manejar el protocolo 'app://'
  protocol.handle('app', (request) => {
    let urlPath = new URL(request.url).pathname;
    
    // Normalizar la ruta y quitar leading slashes
    if (urlPath === '/' || urlPath === '') {
      urlPath = '/index.html';
    }

    // Ruta física del archivo
    let filePath = path.normalize(path.join(__dirname, 'dist', urlPath));
    const distPath = path.normalize(path.join(__dirname, 'dist'));

    // Asegurar que el archivo cargado no escape del directorio dist
    if (!filePath.startsWith(distPath)) {
      filePath = path.join(distPath, 'index.html');
    }

    // Comprobar si el archivo físico existe y no es un directorio.
    // Si no existe, servimos index.html (fallback para enrutamiento SPA de Expo)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distPath, 'index.html');
    }

    // Devolver la respuesta a Electron usando net.fetch (manejador nativo robusto)
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
