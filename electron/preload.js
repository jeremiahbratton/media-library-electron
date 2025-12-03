/**
 * Preload Script
 * 
 * This script runs in the renderer process but has access to Node.js APIs.
 * It acts as a secure bridge between the renderer (UI) and the main process.
 * 
 * For junior developers:
 * - The preload script runs before the page loads
 * - It can use Node.js require() and access Electron APIs
 * - It exposes safe functions to the window object
 * - The renderer can only use these exposed functions, not direct Node.js access
 * - This prevents security vulnerabilities
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // ============================================================================
    // Media Database Operations
    // ============================================================================
    
    /**
     * Get all media items with optional filters
     * @param {Object} options - Filter options (type, search, minRating, brand, system, includeDeleted, onlyDeleted)
     * @returns {Promise<Array>} - Array of media items
     */
    getAllMedia: (options) => ipcRenderer.invoke('media:getAll', options),
    
    /**
     * Get a single media item by ID
     * @param {number} id - Media item ID
     * @returns {Promise<Object|null>} - Media item or null
     */
    getMediaById: (id) => ipcRenderer.invoke('media:getById', id),
    
    /**
     * Create a new media item
     * @param {Object} item - Media item data
     * @returns {Promise<Object>} - Created media item
     */
    createMedia: (item) => ipcRenderer.invoke('media:create', item),
    
    /**
     * Update an existing media item
     * @param {number} id - Media item ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object|null>} - Updated media item or null
     */
    updateMedia: (id, updates) => ipcRenderer.invoke('media:update', id, updates),
    
    /**
     * Soft delete a media item (move to trash)
     * @param {number} id - Media item ID
     * @returns {Promise<boolean>} - Success status
     */
    softDeleteMedia: (id) => ipcRenderer.invoke('media:softDelete', id),
    
    /**
     * Restore a soft-deleted media item
     * @param {number} id - Media item ID
     * @returns {Promise<boolean>} - Success status
     */
    restoreMedia: (id) => ipcRenderer.invoke('media:restore', id),
    
    /**
     * Permanently delete a media item
     * @param {number} id - Media item ID
     * @returns {Promise<boolean>} - Success status
     */
    permanentDeleteMedia: (id) => ipcRenderer.invoke('media:permanentDelete', id),
    
    /**
     * Get all unique brands for autocomplete
     * @returns {Promise<Array>} - Array of brand names
     */
    getBrands: () => ipcRenderer.invoke('media:getBrands'),
    
    /**
     * Get all unique sizes for autocomplete
     * @returns {Promise<Array>} - Array of size values
     */
    getSizes: () => ipcRenderer.invoke('media:getSizes'),
    
    /**
     * Get all unique media types
     * @returns {Promise<Array>} - Array of type values
     */
    getTypes: () => ipcRenderer.invoke('media:getTypes'),
    
    // ============================================================================
    // Import/Export Operations
    // ============================================================================
    
    /**
     * Export all media to JSON format
     * @param {boolean} includeDeleted - Include soft-deleted items
     * @returns {Promise<string>} - JSON string
     */
    exportJSON: (includeDeleted) => ipcRenderer.invoke('media:exportJSON', includeDeleted),
    
    /**
     * Export all media to CSV format
     * @param {boolean} includeDeleted - Include soft-deleted items
     * @returns {Promise<string>} - CSV string
     */
    exportCSV: (includeDeleted) => ipcRenderer.invoke('media:exportCSV', includeDeleted),
    
    /**
     * Import media from JSON
     * @param {string} jsonData - JSON string
     * @returns {Promise<Object>} - Result with success count and errors
     */
    importJSON: (jsonData) => ipcRenderer.invoke('media:importJSON', jsonData),
    
    /**
     * Import media from CSV
     * @param {string} csvData - CSV string
     * @returns {Promise<Object>} - Result with success count and errors
     */
    importCSV: (csvData) => ipcRenderer.invoke('media:importCSV', csvData),
    
    // ============================================================================
    // File Dialog Operations
    // ============================================================================
    
    /**
     * Show file dialog to select an image file
     * @returns {Promise<string|null>} - Selected file path or null if cancelled
     */
    selectImage: () => ipcRenderer.invoke('dialog:selectImage'),
    
    /**
     * Show file dialog to save a file
     * @param {string} defaultFilename - Default filename
     * @param {Array} filters - File type filters
     * @returns {Promise<string|null>} - Selected file path or null if cancelled
     */
    saveFile: (defaultFilename, filters) => ipcRenderer.invoke('dialog:saveFile', defaultFilename, filters),
    
    /**
     * Show file dialog to open a file
     * @param {Array} filters - File type filters
     * @returns {Promise<string|null>} - Selected file path or null if cancelled
     */
    openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
    
    // ============================================================================
    // File System Operations
    // ============================================================================
    
    /**
     * Read a file and return its contents
     * @param {string} filePath - Path to the file
     * @returns {Promise<string>} - File contents
     */
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    
    /**
     * Write a file with the given contents
     * @param {string} filePath - Path to the file
     * @param {string} contents - File contents
     * @returns {Promise<boolean>} - Success status
     */
    writeFile: (filePath, contents) => ipcRenderer.invoke('fs:writeFile', filePath, contents),
    
    /**
     * Check if a file exists
     * @param {string} filePath - Path to the file
     * @returns {Promise<boolean>} - True if file exists
     */
    fileExists: (filePath) => ipcRenderer.invoke('fs:fileExists', filePath),
});

