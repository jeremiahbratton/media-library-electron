-- Media Catalog Database Schema
-- This schema defines the unified media table for cataloging various collectible items
-- Designed for junior developers: each field is documented with its purpose

-- Create the media table with all required fields
CREATE TABLE IF NOT EXISTS media (
    -- Primary key: unique identifier for each item
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Core fields: required for all items
    title TEXT NOT NULL,                    -- Name/title of the item (e.g., "Super Mario Bros", "The Matrix")
    type TEXT NOT NULL,                     -- Type of media (e.g., "video_game", "dvd", "bluray", "board_game", "record", "comic_book", "book", "funko_pop", "sneakers", "coin", "trading_card")
    description TEXT,                       -- Optional detailed description of the item
    
    -- Media identification
    isbn_sku TEXT,                          -- ISBN, SKU, or other product identifier
    
    -- Image handling: stores local file path (not embedded data)
    image TEXT,                             -- Path to the image file on disk
    
    -- Optional rating: floating point value between 1.0 and 5.0
    rating REAL CHECK (rating IS NULL OR (rating >= 1.0 AND rating <= 5.0)),
    
    -- Optional quantity: defaults to 1 if not specified
    quantity INTEGER DEFAULT 1,
    
    -- Conditional fields: used for specific item types
    size TEXT,                              -- Size (e.g., for sneakers: "10", "10.5")
    brand TEXT,                             -- Brand name (e.g., "Nike", "Sony")
    system TEXT,                            -- System/platform (e.g., for video games: "PlayStation 5", "Nintendo Switch")
    
    -- Soft delete: items are not permanently deleted, just marked as deleted
    deleted INTEGER DEFAULT 0,              -- 0 = active, 1 = deleted (soft-delete)
    
    -- Timestamps: track when items are created and last modified
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on type for faster filtering by media type
CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);

-- Create index on deleted flag for faster queries of active vs deleted items
CREATE INDEX IF NOT EXISTS idx_media_deleted ON media(deleted);

-- Create index on title for faster search operations
CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);

-- Create index on brand for autocomplete functionality
CREATE INDEX IF NOT EXISTS idx_media_brand ON media(brand);

-- Create index on size for autocomplete functionality
CREATE INDEX IF NOT EXISTS idx_media_size ON media(size);
