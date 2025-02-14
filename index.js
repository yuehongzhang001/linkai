const { app, BrowserWindow, globalShortcut, clipboard, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
let Store;

(async () => {
    Store = (await import("electron-store")).default;
    setupApp();
})();

function setupApp() {
    const store = new Store();

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
        inputWindow.hide();
        console.log(`[User Input] ${userInput} [Clipboard] ${clipboard.readText()}`);
        const prompt = `Content: ${clipboard.readText()}\nInstruction: ${userInput}\n`;

        const savedOption = store.get("selectedOption");
        const selectedOption = optionsList.find(option => option.value === savedOption);
        const textareaSelector = selectedOption ? selectedOption.textareaSelector : '';
        const buttonSelector = selectedOption ? selectedOption.buttonSelector : '';

        // 读取并执行 executeScript.js 文件的内容
        const scriptContent = await fs.promises.readFile(path.join(__dirname, 'executeScript.js'), 'utf8');
        mainWindow.webContents.executeJavaScript(`
            (function(prompt, textareaSelector, buttonSelector) {
                ${scriptContent}
            })(${JSON.stringify(prompt)}, ${JSON.stringify(textareaSelector)}, ${JSON.stringify(buttonSelector)});
        `);
        mainWindow.show();
    });

    ipcMain.on('update-url', (_, url) => {
        console.log(`[Update URL] ${url}`);
        if (mainWindow) {
            mainWindow.loadURL(url).catch(err => console.error(`Failed to load URL: ${err}`));
            mainWindow.show();
        } else {
            console.error('mainWindow is not initialized');
        }
    });

    let mainWindow;
    let inputWindow;
    let optionsPath;
    let optionsData;
    let optionsList;
    let defaultOption;
    let scriptPath;
    let scriptContent;

    app.whenReady().then(() => {
        optionsPath = path.join(__dirname, "options.json");
        optionsData = fs.readFileSync(optionsPath, "utf-8");
        optionsList = JSON.parse(optionsData);
        defaultOption = optionsList.length > 0 ? optionsList[0].url : 'https://chatgpt.com/';
        scriptPath = path.join(__dirname, 'submit.js');
        scriptContent = fs.readFileSync(scriptPath, 'utf-8');
        createMainWindow();
        createInputWindow();
        registerShortcuts();

        globalShortcut.register('CommandOrControl+Shift+O', () => {
            const selectedText = clipboard.readText();
            console.log(`[Clipboard] ${clipboard.readText()}`);
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
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false, 
                contextIsolation: true, 
                enableRemoteModule: false,
            },
            icon: path.join(__dirname, 'assets', 'icon.icns') // 添加图标路径
        });
         // 获取上次选择的 URL
         const savedOption = store.get("selectedOption", defaultOption);
         const selectedOption = optionsList.find(option => option.value === savedOption);
         const urlToLoad = selectedOption ? selectedOption.url : defaultOption;
 
         mainWindow.loadURL(urlToLoad);
        //  mainWindow.webContents.openDevTools();

          // 监听 new-window 事件并阻止新窗口的创建
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            mainWindow.loadURL(url);
            return { action: 'deny' };
        });
    }

    function createInputWindow() {
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

        inputWindow.loadFile('input.html');
        

        inputWindow.on('blur', () => {
            inputWindow.hide();
        });

        ipcMain.on('submit-input', (_, userInput) => {
            inputWindow.hide();
            console.log(`[User Input] ${userInput} [Clipboard] ${clipboard.readText()}`);
            const prompt = `Content: ${clipboard.readText()}\nInstruction: ${userInput}\n`;

            const savedOption = store.get("selectedOption");
            const selectedOption = optionsList.find(option => option.value === savedOption);
            const textareaSelector = selectedOption ? selectedOption.textareaSelector : '';
            const buttonSelector = selectedOption ? selectedOption.buttonSelector : '';

            // 读取并执行 executeScript.js 文件的内容
            console.log(`testing: 1`);
            mainWindow.webContents.executeJavaScript(`
                (function(prompt, textareaSelector, buttonSelector) {
                    ${scriptContent}
                })(${JSON.stringify(prompt)}, ${JSON.stringify(textareaSelector)}, ${JSON.stringify(buttonSelector)});
            `);
            mainWindow.show();
        });

        ipcMain.on('update-url', (_, url) => {
            console.log(`[Update URL] ${url}`);
            if (mainWindow) {
                console.log('mainWindow is valid');
                mainWindow.loadURL(url).catch(err => console.error(`Failed to load URL: ${err}`));
                mainWindow.show();
            } else {
                console.error('mainWindow is not initialized');
            }
        });
    }

    function registerShortcuts() {
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            inputWindow.show();
        });
    }
}