const { app, BrowserWindow, globalShortcut, clipboard, ipcMain } = require('electron');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');
let Store;

(async () => {
    Store = (await import("electron-store")).default;
    setupApp();
})();

function setupApp() {
    const store = new Store();
    const ROOT_PATH = process.env.ELECTRON_RENDERER_URL || app.getAppPath()
    let mainWindow;
    let inputWindow;
    let optionsPath;
    let optionsData;
    let optionsList;
    let defaultOption;
    let scriptPath;
    let scriptContent;

    log.info(`setupApp ROOT_PATH: ${ROOT_PATH}`);

    ipcMain.on("save-history", (event, input) => {
        let history = store.get("inputHistory", []);
        history = history.filter(item => item !== input);
        history.unshift(input);
        if (history.length > 5) history.pop();
        store.set("inputHistory", history);
    });

    ipcMain.handle("load-history", () => {
        return store.get("inputHistory", []);
    });

    ipcMain.on("save-selected-option", (event, selectedOption) => {
        store.set("selectedOption", selectedOption);
    });

    ipcMain.handle("get-selected-option", (event, defaultValue) => {
        return store.get("selectedOption", defaultValue);
    });

    ipcMain.on('submit-input', async (_, userInput) => {
        log.info(`ipcMain on submit-input: ${userInput}`);
        inputWindow.hide();
        log.verbose(`[User Input] ${userInput} [Clipboard] ${clipboard.readText()}`);
        const prompt = `Content: ${clipboard.readText()}\nInstruction: ${userInput}\n`;

        const savedOption = store.get("selectedOption");
        const selectedOption = optionsList.find(option => option.value === savedOption);
        const textareaSelector = selectedOption ? selectedOption.textareaSelector : '';
        const buttonSelector = selectedOption ? selectedOption.buttonSelector : '';

        // 读取并执行 executeScript.js 文件的内容
        mainWindow.webContents.executeJavaScript(`
            (function(prompt, textareaSelector, buttonSelector) {
                ${scriptContent}
            })(${JSON.stringify(prompt)}, ${JSON.stringify(textareaSelector)}, ${JSON.stringify(buttonSelector)});
        `);
        mainWindow.show();
    });

    ipcMain.on('update-url', (_, url) => {
        log.info(`ipcMain on update-url: ${url}`); 
        log.info(`[Update URL] ${url}`);
        if (mainWindow) {
            mainWindow.loadURL(url).catch(err => console.error(`Failed to load URL: ${err}`));
            mainWindow.show();
        } else {
            console.error('mainWindow is not initialized');
        }
    });

    app.whenReady().then(() => {
        optionsPath = path.join(ROOT_PATH, "options.json");
        optionsData = fs.readFileSync(optionsPath, "utf-8");
        optionsList = JSON.parse(optionsData);
        defaultOption = optionsList.length > 0 ? optionsList[0].url : 'https://chatgpt.com/';
        scriptPath = path.join(ROOT_PATH, 'submit.js');
        scriptContent = fs.readFileSync(scriptPath, 'utf-8');
        createMainWindow();
        createInputWindow();
        registerShortcuts();

        globalShortcut.register('CommandOrControl+Shift+O', () => {
            const selectedText = clipboard.readText();
            log.verbose(`[Clipboard] ${clipboard.readText()}`);
            inputWindow.webContents.send('selected-text', selectedText);
            inputWindow.show();
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
        });
    });

    app.on('will-quit', () => {
        globalShortcut.unregisterAll();
    });

    function createMainWindow() {
        log.info(`createMainWindow begin`);
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false, 
                contextIsolation: true, 
                enableRemoteModule: false,
            },
            icon: path.join(ROOT_PATH, 'assets', 'icon.icns') // 添加图标路径
        });
        log.info(`createMainWindow done`);
         // get URL
        const savedOption = store.get("selectedOption", defaultOption);
        const selectedOption = optionsList.find(option => option.value === savedOption);
        const urlToLoad = selectedOption ? selectedOption.url : defaultOption;
        mainWindow.loadURL(urlToLoad).catch((err) => {
            log.error('Failed to load input.html:', err);
        });

        //  mainWindow.webContents.openDevTools();
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            mainWindow.loadURL(url);
            return { action: 'deny' };
        });
    }

    function createInputWindow() {
        log.info(`createInputWindow begin`);
        inputWindow = new BrowserWindow({
            width: 400,
            height: 280,
            frame: false,
            alwaysOnTop: false,
            resizable: false,
            transparent: true,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        log.info(`createInputWindow done`);

        inputWindow.loadFile(path.join(ROOT_PATH, 'input.html')).catch((err) => {
            log.error('Failed to load input.html:', err);
        });
        

        inputWindow.on('blur', () => {
            inputWindow.hide();
        });
    }

    function registerShortcuts() {
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            inputWindow.show();
        });
    }
}