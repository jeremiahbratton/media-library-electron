# App of holding

Desktop application for cataloging the things I purchase instead of spending time with other people.

## Features

- **Unified Media Catalog**: Catalog various collectible items including:
  - Video games, DVDs, Blu-rays
  - Board games, records, comic books, books
  - Funko pops, sneakers, rare coins, trading cards
  - And more!

- **Full CRUD Operations**: Create, read, update, and delete media items
- **Image Management**: Attach images to items (stored as file paths)
- **Rating System**: Rate items from 1.0 to 5.0 with a visual star interface
- **Advanced Search & Filtering**: Search by title/description, filter by type, rating, brand, system
- **Soft Delete**: Deleted items go to trash and can be recovered
- **Import/Export**: Bulk import/export data as JSON or CSV
- **Autocomplete**: Brand and size fields suggest values from existing items
- **Dark Mode**: Toggle between light and dark themes
- **Conditional Fields**: System field for video games, size field for sneakers

## Technology Stack

- **Electron**: Cross-platform desktop application framework
- **Node.js 24**: JavaScript runtime
- **better-sqlite3**: Lightweight, synchronous SQLite database
- **Bulma**: Modern CSS framework
- **Playwright**: Automated testing

## Getting Started

### Prerequisites

- Node.js 24 or higher
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd media-library
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application:
   ```bash
   npm start
   ```

### Building

To build the application for distribution:

```bash
npm run build
```

This will create distributable packages for your platform using electron-builder.

## Project Structure

```
media-library/
├── electron/
│   ├── main.js          # Electron main process (backend)
│   └── preload.js       # IPC bridge for secure communication
├── db/
│   ├── schema.sql       # Database schema definition
│   └── repo.js          # Database access layer
├── src/
│   ├── index.html       # Main UI HTML
│   ├── renderer.js      # Frontend JavaScript logic
│   └── styles.css       # Custom styles and dark mode
├── assets/              # Static assets (icons, images)
├── tests/               # Automated tests
└── package.json         # Project configuration
```

## Usage

### Adding Items

1. Click the "Add Item" button
2. Fill in the required fields (Title, Type)
3. Optionally add description, rating, image, and other details
4. Click "Save"

### Searching and Filtering

- Use the search box to search by title or description
- Use the filter dropdowns to filter by type, rating, brand, or system
- Click "Clear Filters" to reset all filters

### Managing Images

- Click "Browse Files" to select an image from your computer
- Images are stored as file paths (not embedded in the database)
- Click on an image in the catalog to view it full-size

### Trash and Recovery

- Deleted items are moved to the Trash view
- Access Trash from the navigation menu
- Restore items or permanently delete them from Trash

### Import/Export

- Click "Import/Export" in the top menu
- Export your catalog as JSON or CSV
- Import data from previously exported files

## Database

The application uses SQLite for local data storage. The database file is stored in your system's application data directory:

- **macOS**: `~/Library/Application Support/app-of-holding/media-catalog.db`
- **Windows**: `%APPDATA%/app-of-holding/media-catalog.db`
- **Linux**: `~/.config/app-of-holding/media-catalog.db`

## Development

### Code Structure

The application follows a clear separation of concerns:

- **Main Process** (`electron/main.js`): Handles app lifecycle, database initialization, and IPC
- **Preload Script** (`electron/preload.js`): Exposes safe APIs to the renderer
- **Database Layer** (`db/repo.js`): All database operations
- **Renderer** (`src/renderer.js`): UI logic and user interactions

### Testing

Run the test suite:

```bash
npm test
```

See `tests/README.md` for more information about testing.

## Documentation

The codebase includes extensive comments aimed at junior developers. Key concepts are explained throughout the code to help with maintenance and future development.

## License

ISC

## Contributing

This is a personal project, but suggestions and improvements are welcome!

