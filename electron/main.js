/**
 * Electron Main Process
 * 
 * This is the main entry point for the Electron application.
 * It runs in Node.js and handles:
 * - Creating and managing the application window
 * - Database initialization
 * - IPC (Inter-Process Communication) between main and renderer processes
 * - File system operations
 * 
 * For junior developers:
 * - The main process has full Node.js access (can use require, fs, etc.)
 * - The renderer process (UI) runs in a sandboxed browser environment
 * - IPC allows safe communication between them
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const repo = require('../db/repo');

// Keep a global reference to the window object
let mainWindow = null;

/**
 * Create the main application window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            // Security: enable context isolation and disable node integration
            contextIsolation: true,
            nodeIntegration: false,
            // Load the preload script to expose safe APIs
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, '../src/index.html'));

    // Open DevTools in development (comment out for production)
    // mainWindow.webContents.openDevTools();

    // Clean up when window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Initialize the application
 */
app.whenReady().then(() => {
    // Initialize the database with user data path
    const userDataPath = app.getPath('userData');
    if (!repo.initDatabase(userDataPath)) {
        console.error('Failed to initialize database');
        app.quit();
        return;
    }

    // Create the main window
    createWindow();

    // On macOS, re-create window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    // Close database connection
    repo.closeDatabase();
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Clean up before app quits
app.on('before-quit', () => {
    repo.closeDatabase();
});

// ============================================================================
// IPC Handlers - These handle requests from the renderer process
// ============================================================================

/**
 * Get all media items with optional filters
 */
ipcMain.handle('media:getAll', async (event, options) => {
    try {
        return repo.getAllMedia(options);
    } catch (error) {
        console.error('Error getting media:', error);
        throw error;
    }
});

/**
 * Get a single media item by ID
 */
ipcMain.handle('media:getById', async (event, id) => {
    try {
        return repo.getMediaById(id);
    } catch (error) {
        console.error('Error getting media by ID:', error);
        throw error;
    }
});

/**
 * Create a new media item
 */
ipcMain.handle('media:create', async (event, item) => {
    try {
        return repo.createMedia(item);
    } catch (error) {
        console.error('Error creating media:', error);
        throw error;
    }
});

/**
 * Update an existing media item
 */
ipcMain.handle('media:update', async (event, id, updates) => {
    try {
        return repo.updateMedia(id, updates);
    } catch (error) {
        console.error('Error updating media:', error);
        throw error;
    }
});

/**
 * Soft delete a media item (move to trash)
 */
ipcMain.handle('media:softDelete', async (event, id) => {
    try {
        return repo.softDeleteMedia(id);
    } catch (error) {
        console.error('Error soft deleting media:', error);
        throw error;
    }
});

/**
 * Restore a soft-deleted media item
 */
ipcMain.handle('media:restore', async (event, id) => {
    try {
        return repo.restoreMedia(id);
    } catch (error) {
        console.error('Error restoring media:', error);
        throw error;
    }
});

/**
 * Permanently delete a media item
 */
ipcMain.handle('media:permanentDelete', async (event, id) => {
    try {
        return repo.permanentDeleteMedia(id);
    } catch (error) {
        console.error('Error permanently deleting media:', error);
        throw error;
    }
});

/**
 * Get all unique brands for autocomplete
 */
ipcMain.handle('media:getBrands', async (event) => {
    try {
        return repo.getBrands();
    } catch (error) {
        console.error('Error getting brands:', error);
        throw error;
    }
});

/**
 * Get all unique sizes for autocomplete
 */
ipcMain.handle('media:getSizes', async (event) => {
    try {
        return repo.getSizes();
    } catch (error) {
        console.error('Error getting sizes:', error);
        throw error;
    }
});

/**
 * Get all unique types for filtering
 */
ipcMain.handle('media:getTypes', async (event) => {
    try {
        return repo.getTypes();
    } catch (error) {
        console.error('Error getting types:', error);
        throw error;
    }
});

/**
 * Export media to JSON
 */
ipcMain.handle('media:exportJSON', async (event, includeDeleted) => {
    try {
        return repo.exportToJSON(includeDeleted);
    } catch (error) {
        console.error('Error exporting JSON:', error);
        throw error;
    }
});

/**
 * Export media to CSV
 */
ipcMain.handle('media:exportCSV', async (event, includeDeleted) => {
    try {
        return repo.exportToCSV(includeDeleted);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw error;
    }
});

/**
 * Import media from JSON
 */
ipcMain.handle('media:importJSON', async (event, jsonData) => {
    try {
        return repo.importFromJSON(jsonData);
    } catch (error) {
        console.error('Error importing JSON:', error);
        throw error;
    }
});

/**
 * Import media from CSV
 */
ipcMain.handle('media:importCSV', async (event, csvData) => {
    try {
        return repo.importFromCSV(csvData);
    } catch (error) {
        console.error('Error importing CSV:', error);
        throw error;
    }
});

/**
 * Show file dialog to select an image file
 * Returns the selected file path
 */
ipcMain.handle('dialog:selectImage', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Image',
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
                { name: 'All Files', extensions: ['*'] },
            ],
            properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    } catch (error) {
        console.error('Error selecting image:', error);
        throw error;
    }
});

/**
 * Show file dialog to save a file
 * Returns the selected file path or null if cancelled
 */
ipcMain.handle('dialog:saveFile', async (event, defaultFilename, filters) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save File',
            defaultPath: defaultFilename,
            filters: filters || [{ name: 'All Files', extensions: ['*'] }],
        });

        if (result.canceled || !result.filePath) {
            return null;
        }

        return result.filePath;
    } catch (error) {
        console.error('Error saving file:', error);
        throw error;
    }
});

/**
 * Show file dialog to open a file
 * Returns the selected file path or null if cancelled
 */
ipcMain.handle('dialog:openFile', async (event, filters) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Open File',
            filters: filters || [{ name: 'All Files', extensions: ['*'] }],
            properties: ['openFile'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    } catch (error) {
        console.error('Error opening file:', error);
        throw error;
    }
});

/**
 * Read a file and return its contents as a string
 */
ipcMain.handle('fs:readFile', async (event, filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

/**
 * Write a file with the given contents
 */
ipcMain.handle('fs:writeFile', async (event, filePath, contents) => {
    try {
        fs.writeFileSync(filePath, contents, 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        throw error;
    }
});

/**
 * Check if a file exists
 */
ipcMain.handle('fs:fileExists', async (event, filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        console.error('Error checking file existence:', error);
        throw error;
    }
});
