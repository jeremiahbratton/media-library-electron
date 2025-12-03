/**
 * Database Repository Module
 * 
 * This module handles all database operations for the media catalog.
 * It uses better-sqlite3 for synchronous database access.
 * 
 * For junior developers:
 * - All database operations are synchronous (they block until complete)
 * - The database connection is created once and reused
 * - SQL injection is prevented by using prepared statements
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPath = null;

/**
 * Initialize the database connection and create tables if they don't exist
 * This should be called once when the app starts
 * @param {string} userDataPath - Path to the user's app data directory
 */
function initDatabase(userDataPath) {
    try {
        // Set the database path in the user's app data directory
        // This ensures the database persists between app sessions
        dbPath = path.join(userDataPath, 'media-catalog.db');
        
        // Open or create the database file
        db = new Database(dbPath);
        
        // Enable foreign keys (good practice, even though we only have one table)
        db.pragma('foreign_keys = ON');
        
        // Read and execute the schema SQL file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        
        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing database:', error);
        return false;
    }
}

/**
 * Close the database connection
 * Should be called when the app is shutting down
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

/**
 * Create a new media item
 * @param {Object} item - The media item data
 * @returns {Object} - The created item with its ID
 */
function createMedia(item) {
    const stmt = db.prepare(`
        INSERT INTO media (
            title, type, description, isbn_sku, image, rating, 
            quantity, size, brand, system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
        item.title || '',
        item.type || '',
        item.description || null,
        item.isbn_sku || null,
        item.image || null,
        item.rating || null,
        item.quantity ?? 1,
        item.size || null,
        item.brand || null,
        item.system || null
    );
    
    // Return the created item with its new ID
    return getMediaById(result.lastInsertRowid);
}

/**
 * Get a single media item by ID
 * @param {number} id - The media item ID
 * @returns {Object|null} - The media item or null if not found
 */
function getMediaById(id) {
    const stmt = db.prepare('SELECT * FROM media WHERE id = ?');
    return stmt.get(id) || null;
}

/**
 * Get all media items (excluding soft-deleted items by default)
 * @param {Object} options - Query options
 * @param {boolean} options.includeDeleted - Include soft-deleted items
 * @param {string} options.type - Filter by media type
 * @param {string} options.search - Search term for title/description
 * @param {number} options.minRating - Minimum rating filter
 * @param {string} options.brand - Filter by brand
 * @param {string} options.system - Filter by system
 * @returns {Array} - Array of media items
 */
function getAllMedia(options = {}) {
    let query = 'SELECT * FROM media WHERE 1=1';
    const params = [];
    
    // Filter out deleted items unless explicitly requested
    if (!options.includeDeleted) {
        query += ' AND deleted = 0';
    } else if (options.onlyDeleted) {
        query += ' AND deleted = 1';
    }
    
    // Filter by type
    if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
    }
    
    // Search in title and description
    if (options.search) {
        query += ' AND (title LIKE ? OR description LIKE ?)';
        const searchTerm = `%${options.search}%`;
        params.push(searchTerm, searchTerm);
    }
    
    // Filter by minimum rating
    if (options.minRating !== undefined) {
        query += ' AND rating >= ?';
        params.push(options.minRating);
    }
    
    // Filter by brand
    if (options.brand) {
        query += ' AND brand = ?';
        params.push(options.brand);
    }
    
    // Filter by system
    if (options.system) {
        query += ' AND system = ?';
        params.push(options.system);
    }
    
    // Order by most recently updated first
    query += ' ORDER BY updated_at DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
}

/**
 * Update an existing media item
 * @param {number} id - The media item ID
 * @param {Object} updates - The fields to update
 * @returns {Object|null} - The updated item or null if not found
 */
function updateMedia(id, updates) {
    // Build dynamic update query based on provided fields
    const fields = [];
    const values = [];
    
    const allowedFields = ['title', 'type', 'description', 'isbn_sku', 'image', 
                          'rating', 'quantity', 'size', 'brand', 'system'];
    
    for (const field of allowedFields) {
        if (updates.hasOwnProperty(field)) {
            fields.push(`${field} = ?`);
            values.push(updates[field] || null);
        }
    }
    
    if (fields.length === 0) {
        return getMediaById(id);
    }
    
    // Always update the updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const query = `UPDATE media SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = db.prepare(query);
    stmt.run(...values);
    
    return getMediaById(id);
}

/**
 * Soft delete a media item (marks it as deleted but doesn't remove it)
 * @param {number} id - The media item ID
 * @returns {boolean} - True if successful
 */
function softDeleteMedia(id) {
    const stmt = db.prepare('UPDATE media SET deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

/**
 * Restore a soft-deleted media item
 * @param {number} id - The media item ID
 * @returns {boolean} - True if successful
 */
function restoreMedia(id) {
    const stmt = db.prepare('UPDATE media SET deleted = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

/**
 * Permanently delete a media item from the database
 * @param {number} id - The media item ID
 * @returns {boolean} - True if successful
 */
function permanentDeleteMedia(id) {
    const stmt = db.prepare('DELETE FROM media WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
}

/**
 * Get all unique brands for autocomplete
 * @returns {Array} - Array of unique brand names
 */
function getBrands() {
    const stmt = db.prepare('SELECT DISTINCT brand FROM media WHERE brand IS NOT NULL AND brand != "" AND deleted = 0 ORDER BY brand');
    const results = stmt.all();
    return results.map(row => row.brand);
}

/**
 * Get all unique sizes for autocomplete
 * @returns {Array} - Array of unique size values
 */
function getSizes() {
    const stmt = db.prepare('SELECT DISTINCT size FROM media WHERE size IS NOT NULL AND size != "" AND deleted = 0 ORDER BY size');
    const results = stmt.all();
    return results.map(row => row.size);
}

/**
 * Get all unique media types
 * @returns {Array} - Array of unique type values
 */
function getTypes() {
    const stmt = db.prepare('SELECT DISTINCT type FROM media WHERE deleted = 0 ORDER BY type');
    const results = stmt.all();
    return results.map(row => row.type);
}

/**
 * Export all media items to JSON format
 * @param {boolean} includeDeleted - Whether to include soft-deleted items
 * @returns {string} - JSON string of all media items
 */
function exportToJSON(includeDeleted = false) {
    const items = getAllMedia({ includeDeleted });
    return JSON.stringify(items, null, 2);
}

/**
 * Export all media items to CSV format
 * @param {boolean} includeDeleted - Whether to include soft-deleted items
 * @returns {string} - CSV string of all media items
 */
function exportToCSV(includeDeleted = false) {
    const items = getAllMedia({ includeDeleted });
    
    if (items.length === 0) {
        return '';
    }
    
    // CSV header row
    const headers = ['id', 'title', 'type', 'description', 'isbn_sku', 'image', 
                     'rating', 'quantity', 'size', 'brand', 'system', 'deleted', 
                     'created_at', 'updated_at'];
    
    // Escape CSV values (handle commas, quotes, newlines)
    function escapeCSV(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }
    
    // Build CSV rows
    const rows = [headers.join(',')];
    for (const item of items) {
        const row = headers.map(header => escapeCSV(item[header]));
        rows.push(row.join(','));
    }
    
    return rows.join('\n');
}

/**
 * Import media items from JSON
 * @param {string} jsonData - JSON string or array of media items
 * @returns {Object} - Result with success count and errors
 */
function importFromJSON(jsonData) {
    let items;
    try {
        items = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        if (!Array.isArray(items)) {
            throw new Error('JSON data must be an array');
        }
    } catch (error) {
        return { success: 0, errors: [`Invalid JSON: ${error.message}`] };
    }
    
    const errors = [];
    let success = 0;
    
    // Use a transaction for better performance and atomicity
    const insertStmt = db.prepare(`
        INSERT INTO media (
            title, type, description, isbn_sku, image, rating, 
            quantity, size, brand, system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((items) => {
        for (const item of items) {
            try {
                insertStmt.run(
                    item.title || '',
                    item.type || '',
                    item.description || null,
                    item.isbn_sku || null,
                    item.image || null,
                    item.rating || null,
                    item.quantity ?? 1,
                    item.size || null,
                    item.brand || null,
                    item.system || null
                );
                success++;
            } catch (error) {
                errors.push(`Item "${item.title || 'Unknown'}": ${error.message}`);
            }
        }
    });
    
    insertMany(items);
    
    return { success, errors };
}

/**
 * Import media items from CSV
 * @param {string} csvData - CSV string
 * @returns {Object} - Result with success count and errors
 */
function importFromCSV(csvData) {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return { success: 0, errors: ['CSV file is empty'] };
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['title', 'type', 'description', 'isbn_sku', 'image', 
                            'rating', 'quantity', 'size', 'brand', 'system'];
    
    // Map header indices
    const headerMap = {};
    for (const expected of expectedHeaders) {
        const index = headers.indexOf(expected);
        if (index !== -1) {
            headerMap[expected] = index;
        }
    }
    
    if (!headerMap.title || !headerMap.type) {
        return { success: 0, errors: ['CSV must have "title" and "type" columns'] };
    }
    
    const errors = [];
    let success = 0;
    
    // Simple CSV parser (handles quoted values)
    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    
    const insertStmt = db.prepare(`
        INSERT INTO media (
            title, type, description, isbn_sku, image, rating, 
            quantity, size, brand, system
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((items) => {
        for (const item of items) {
            try {
                insertStmt.run(
                    item.title || '',
                    item.type || '',
                    item.description || null,
                    item.isbn_sku || null,
                    item.image || null,
                    item.rating || null,
                    item.quantity ?? 1,
                    item.size || null,
                    item.brand || null,
                    item.system || null
                );
                success++;
            } catch (error) {
                errors.push(`Row ${item._rowNum}: ${error.message}`);
            }
        }
    });
    
    const items = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const item = {
            _rowNum: i + 1,
            title: values[headerMap.title] || '',
            type: values[headerMap.type] || '',
            description: headerMap.description ? values[headerMap.description] : null,
            isbn_sku: headerMap.isbn_sku ? values[headerMap.isbn_sku] : null,
            image: headerMap.image ? values[headerMap.image] : null,
            rating: headerMap.rating ? parseFloat(values[headerMap.rating]) || null : null,
            quantity: headerMap.quantity ? parseInt(values[headerMap.quantity]) || 1 : 1,
            size: headerMap.size ? values[headerMap.size] : null,
            brand: headerMap.brand ? values[headerMap.brand] : null,
            system: headerMap.system ? values[headerMap.system] : null,
        };
        items.push(item);
    }
    
    insertMany(items);
    
    return { success, errors };
}

module.exports = {
    initDatabase,
    closeDatabase,
    createMedia,
    getMediaById,
    getAllMedia,
    updateMedia,
    softDeleteMedia,
    restoreMedia,
    permanentDeleteMedia,
    getBrands,
    getSizes,
    getTypes,
    exportToJSON,
    exportToCSV,
    importFromJSON,
    importFromCSV,
};

