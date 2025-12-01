/**
 * Renderer Process Script
 * 
 * This script runs in the browser context and handles all UI interactions.
 * It communicates with the main process through the electronAPI object
 * exposed by the preload script.
 * 
 * For junior developers:
 * - This runs in the renderer process (browser-like environment)
 * - Cannot directly use Node.js require() or fs
 * - Uses window.electronAPI to communicate with main process
 * - All database operations go through IPC (Inter-Process Communication)
 */

// ============================================================================
// Global State
// ============================================================================

let currentMedia = [];
let currentView = 'catalog';
let editingMediaId = null;
let currentRating = 0;

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize the application
 */
async function initializeApp() {
    // Load theme preference
    loadTheme();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadMedia();
    await loadAutocompleteData();
    
    // Set up view switching
    setupViewSwitching();
}

// ============================================================================
// Theme Management
// ============================================================================

/**
 * Load saved theme preference or use system preference
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

/**
 * Set the theme (light or dark)
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.getElementById('themeIcon');
    const themeToggle = document.getElementById('themeToggle');
    
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeToggle.checked = true;
    } else {
        themeIcon.className = 'fas fa-moon';
        themeToggle.checked = false;
    }
}

/**
 * Toggle between light and dark theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// ============================================================================
// Event Listeners Setup
// ============================================================================

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('change', toggleTheme);
    
    // Navigation
    document.getElementById('addMediaBtn').addEventListener('click', () => openMediaModal());
    
    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', closeMediaModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeMediaModal);
    document.querySelector('.modal-background').addEventListener('click', closeMediaModal);
    
    // Form submission
    document.getElementById('saveMediaBtn').addEventListener('click', saveMedia);
    document.getElementById('mediaForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveMedia();
    });
    
    // Image handling
    document.getElementById('selectImageBtn').addEventListener('click', selectImageFile);
    document.getElementById('imageInput').addEventListener('change', handleImageFileSelect);
    document.getElementById('removeImageBtn').addEventListener('click', removeImage);
    
    // Rating stars
    setupRatingStars();
    
    // Filters
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('ratingFilter').addEventListener('change', applyFilters);
    document.getElementById('brandFilter').addEventListener('change', applyFilters);
    document.getElementById('systemFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    
    // Import/Export
    document.getElementById('exportJSONBtn').addEventListener('click', () => exportData('json'));
    document.getElementById('exportCSVBtn').addEventListener('click', () => exportData('csv'));
    document.getElementById('importJSONBtn').addEventListener('click', () => importData('json'));
    document.getElementById('importCSVBtn').addEventListener('click', () => importData('csv'));
    
    // Image modal
    document.getElementById('closeImageModalBtn').addEventListener('click', closeImageModal);
    document.querySelector('#imageModal .modal-background').addEventListener('click', closeImageModal);
    
    // Type change handler for conditional fields
    document.getElementById('typeInput').addEventListener('change', handleTypeChange);
}

// ============================================================================
// View Switching
// ============================================================================

function setupViewSwitching() {
    document.querySelectorAll('[data-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            switchView(view);
        });
    });
}

function switchView(view) {
    currentView = view;
    
    // Update navigation
    document.querySelectorAll('[data-view]').forEach(link => {
        link.classList.toggle('is-active', link.getAttribute('data-view') === view);
    });
    
    // Show/hide views
    document.getElementById('catalogView').style.display = view === 'catalog' ? 'block' : 'none';
    document.getElementById('trashView').style.display = view === 'trash' ? 'block' : 'none';
    
    // Load appropriate data
    if (view === 'catalog') {
        loadMedia();
    } else if (view === 'trash') {
        loadTrash();
    }
}

// ============================================================================
// Media Loading and Display
// ============================================================================

/**
 * Load all media items from the database
 */
async function loadMedia() {
    try {
        const options = getFilterOptions();
        currentMedia = await window.electronAPI.getAllMedia(options);
        await renderMediaGrid();
    } catch (error) {
        console.error('Error loading media:', error);
        showNotification('Error loading media items', 'is-danger');
    }
}

/**
 * Load deleted items (trash)
 */
async function loadTrash() {
    try {
        const items = await window.electronAPI.getAllMedia({ onlyDeleted: true });
        renderTrashGrid(items);
    } catch (error) {
        console.error('Error loading trash:', error);
        showNotification('Error loading trash', 'is-danger');
    }
}

/**
 * Render the media grid
 */
async function renderMediaGrid() {
    const grid = document.getElementById('mediaGrid');
    const emptyState = document.getElementById('emptyState');
    
    grid.innerHTML = '';
    
    if (currentMedia.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // Use Promise.all to handle async card creation
    const cardPromises = currentMedia.map(item => createMediaCard(item));
    const cards = await Promise.all(cardPromises);
    cards.forEach(card => grid.appendChild(card));
}

/**
 * Create a media card element
 */
async function createMediaCard(item) {
    const column = document.createElement('div');
    column.className = 'column is-one-third-tablet is-one-quarter-desktop';
    
    const card = document.createElement('div');
    card.className = 'card media-card';
    
    // Image section
    const cardImage = document.createElement('div');
    cardImage.className = 'card-image';
    
    let imageExists = false;
    if (item.image) {
        try {
            imageExists = await window.electronAPI.fileExists(item.image);
        } catch (error) {
            console.error('Error checking image file:', error);
        }
    }
    
    if (item.image && imageExists) {
        const figure = document.createElement('figure');
        figure.className = 'image is-4by3';
        const img = document.createElement('img');
        img.src = `file://${item.image}`;
        img.alt = item.title;
        img.className = 'media-card-image';
        img.addEventListener('click', () => showImageModal(item.image));
        figure.appendChild(img);
        cardImage.appendChild(figure);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'media-card-placeholder';
        placeholder.innerHTML = '<i class="fas fa-image fa-3x"></i>';
        cardImage.appendChild(placeholder);
    }
    
    // Card content
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    
    // Title
    const title = document.createElement('p');
    title.className = 'title is-5';
    title.textContent = item.title;
    cardContent.appendChild(title);
    
    // Type badge
    const typeBadge = document.createElement('span');
    typeBadge.className = 'tag is-primary mb-2';
    typeBadge.textContent = formatType(item.type);
    cardContent.appendChild(typeBadge);
    
    // Rating
    if (item.rating) {
        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'mb-2';
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('i');
            star.className = `fas fa-star ${i <= item.rating ? 'has-text-warning' : 'has-text-grey-light'}`;
            ratingDiv.appendChild(star);
        }
        cardContent.appendChild(ratingDiv);
    }
    
    // Additional info
    const info = document.createElement('div');
    info.className = 'content is-small';
    if (item.brand) {
        const brandP = document.createElement('p');
        brandP.innerHTML = `<strong>Brand:</strong> ${item.brand}`;
        info.appendChild(brandP);
    }
    if (item.system) {
        const systemP = document.createElement('p');
        systemP.innerHTML = `<strong>System:</strong> ${item.system}`;
        info.appendChild(systemP);
    }
    if (item.quantity > 1) {
        const qtyP = document.createElement('p');
        qtyP.innerHTML = `<strong>Quantity:</strong> ${item.quantity}`;
        info.appendChild(qtyP);
    }
    cardContent.appendChild(info);
    
    // Card footer with actions
    const cardFooter = document.createElement('footer');
    cardFooter.className = 'card-footer';
    
    const editBtn = document.createElement('a');
    editBtn.className = 'card-footer-item';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.addEventListener('click', () => openMediaModal(item.id));
    cardFooter.appendChild(editBtn);
    
    const deleteBtn = document.createElement('a');
    deleteBtn.className = 'card-footer-item has-text-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.addEventListener('click', () => deleteMedia(item.id));
    cardFooter.appendChild(deleteBtn);
    
    card.appendChild(cardImage);
    card.appendChild(cardContent);
    card.appendChild(cardFooter);
    column.appendChild(card);
    
    return column;
}

/**
 * Render trash grid
 */
function renderTrashGrid(items) {
    const grid = document.getElementById('trashGrid');
    const emptyState = document.getElementById('trashEmptyState');
    
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'flex';
    emptyState.style.display = 'none';
    
    items.forEach(item => {
        const card = createTrashCard(item);
        grid.appendChild(card);
    });
}

/**
 * Create a trash card element
 */
function createTrashCard(item) {
    const column = document.createElement('div');
    column.className = 'column is-one-third-tablet is-one-quarter-desktop';
    
    const card = document.createElement('div');
    card.className = 'card';
    
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    
    const title = document.createElement('p');
    title.className = 'title is-5';
    title.textContent = item.title;
    cardContent.appendChild(title);
    
    const typeBadge = document.createElement('span');
    typeBadge.className = 'tag is-grey mb-2';
    typeBadge.textContent = formatType(item.type);
    cardContent.appendChild(typeBadge);
    
    const cardFooter = document.createElement('footer');
    cardFooter.className = 'card-footer';
    
    const restoreBtn = document.createElement('a');
    restoreBtn.className = 'card-footer-item has-text-success';
    restoreBtn.innerHTML = '<i class="fas fa-undo"></i> Restore';
    restoreBtn.addEventListener('click', () => restoreMedia(item.id));
    cardFooter.appendChild(restoreBtn);
    
    const deleteBtn = document.createElement('a');
    deleteBtn.className = 'card-footer-item has-text-danger';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i> Delete Forever';
    deleteBtn.addEventListener('click', () => permanentDeleteMedia(item.id));
    cardFooter.appendChild(deleteBtn);
    
    card.appendChild(cardContent);
    card.appendChild(cardFooter);
    column.appendChild(card);
    
    return column;
}

// ============================================================================
// Media Modal
// ============================================================================

/**
 * Open the media modal for adding or editing
 */
async function openMediaModal(mediaId = null) {
    editingMediaId = mediaId;
    const modal = document.getElementById('mediaModal');
    const form = document.getElementById('mediaForm');
    const modalTitle = document.getElementById('modalTitle');
    
    // Reset form
    form.reset();
    currentRating = 0;
    updateRatingStars(0);
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageFileName').textContent = 'No file selected';
    document.getElementById('mediaId').value = '';
    
    // Set conditional fields visibility
    handleTypeChange();
    
    if (mediaId) {
        modalTitle.textContent = 'Edit Media Item';
        await loadMediaForEdit(mediaId);
    } else {
        modalTitle.textContent = 'Add Media Item';
    }
    
    modal.classList.add('is-active');
}

/**
 * Load media item for editing
 */
async function loadMediaForEdit(id) {
    try {
        const item = await window.electronAPI.getMediaById(id);
        if (!item) {
            showNotification('Media item not found', 'is-danger');
            closeMediaModal();
            return;
        }
        
        document.getElementById('mediaId').value = item.id;
        document.getElementById('titleInput').value = item.title || '';
        document.getElementById('typeInput').value = item.type || '';
        document.getElementById('descriptionInput').value = item.description || '';
        document.getElementById('isbnSkuInput').value = item.isbn_sku || '';
        document.getElementById('quantityInput').value = item.quantity || 1;
        document.getElementById('brandInput').value = item.brand || '';
        document.getElementById('sizeInput').value = item.size || '';
        document.getElementById('systemInput').value = item.system || '';
        
        if (item.rating) {
            currentRating = item.rating;
            updateRatingStars(item.rating);
        }
        
        if (item.image) {
            document.getElementById('imageFileName').textContent = item.image.split(/[/\\]/).pop();
            if (await window.electronAPI.fileExists(item.image)) {
                const previewImg = document.getElementById('previewImg');
                previewImg.src = `file://${item.image}`;
                document.getElementById('imagePreview').style.display = 'block';
            }
        }
        
        handleTypeChange();
    } catch (error) {
        console.error('Error loading media for edit:', error);
        showNotification('Error loading media item', 'is-danger');
    }
}

/**
 * Close the media modal
 */
function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    modal.classList.remove('is-active');
    editingMediaId = null;
    currentRating = 0;
}

/**
 * Save media item (create or update)
 */
async function saveMedia() {
    const form = document.getElementById('mediaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const mediaId = document.getElementById('mediaId').value;
    const imageInput = document.getElementById('imageInput');
    
    const mediaData = {
        title: document.getElementById('titleInput').value.trim(),
        type: document.getElementById('typeInput').value,
        description: document.getElementById('descriptionInput').value.trim() || null,
        isbn_sku: document.getElementById('isbnSkuInput').value.trim() || null,
        quantity: parseInt(document.getElementById('quantityInput').value) || 1,
        rating: currentRating || null,
        brand: document.getElementById('brandInput').value.trim() || null,
        size: document.getElementById('sizeInput').value.trim() || null,
        system: document.getElementById('systemInput').value.trim() || null,
    };
    
    // Handle image file
    const imagePath = document.getElementById('imageInput').getAttribute('data-path');
    if (imagePath) {
        // Use the path from the file dialog
        mediaData.image = imagePath;
    } else if (imageInput.files && imageInput.files.length > 0) {
        // Fallback: if file input has a file, try to get path
        // Note: In Electron, file inputs may not expose path directly
        // The selectImageFile function handles this via dialog
        mediaData.image = null; // Will need to handle file upload differently
    } else if (document.getElementById('imagePreview').style.display === 'block') {
        // Keep existing image if no new file selected
        const existingItem = await window.electronAPI.getMediaById(mediaId);
        if (existingItem) {
            mediaData.image = existingItem.image;
        }
    } else {
        mediaData.image = null;
    }
    
    try {
        if (mediaId) {
            await window.electronAPI.updateMedia(parseInt(mediaId), mediaData);
            showNotification('Media item updated successfully', 'is-success');
        } else {
            await window.electronAPI.createMedia(mediaData);
            showNotification('Media item created successfully', 'is-success');
        }
        
        closeMediaModal();
        await loadMedia();
        await loadAutocompleteData();
    } catch (error) {
        console.error('Error saving media:', error);
        showNotification('Error saving media item', 'is-danger');
    }
}

// ============================================================================
// Image Handling
// ============================================================================

/**
 * Select image file using file dialog
 */
async function selectImageFile() {
    try {
        const filePath = await window.electronAPI.selectImage();
        if (filePath) {
            document.getElementById('imageFileName').textContent = filePath.split(/[/\\]/).pop();
            const previewImg = document.getElementById('previewImg');
            previewImg.src = `file://${filePath}`;
            document.getElementById('imagePreview').style.display = 'block';
            
            // Also set the file input (though Electron file dialog doesn't populate this)
            // We'll store the path in a data attribute
            document.getElementById('imageInput').setAttribute('data-path', filePath);
        }
    } catch (error) {
        console.error('Error selecting image:', error);
        showNotification('Error selecting image file', 'is-danger');
    }
}

/**
 * Handle image file selection from input
 */
function handleImageFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        document.getElementById('imageFileName').textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewImg = document.getElementById('previewImg');
            previewImg.src = e.target.result;
            document.getElementById('imagePreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Remove image
 */
function removeImage() {
    document.getElementById('imageInput').value = '';
    document.getElementById('imageInput').removeAttribute('data-path');
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imageFileName').textContent = 'No file selected';
}

/**
 * Show image in full-size modal
 */
function showImageModal(imagePath) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('fullImage');
    img.src = `file://${imagePath}`;
    modal.classList.add('is-active');
}

/**
 * Close image modal
 */
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('is-active');
}

// ============================================================================
// Rating Stars
// ============================================================================

function setupRatingStars() {
    const stars = document.querySelectorAll('.rating-stars .fa-star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            currentRating = rating;
            updateRatingStars(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            highlightStars(rating);
        });
    });
    
    document.querySelector('.rating-stars').addEventListener('mouseleave', () => {
        updateRatingStars(currentRating);
    });
}

function updateRatingStars(rating) {
    const stars = document.querySelectorAll('.rating-stars .fa-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    document.getElementById('ratingInput').value = rating || '';
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.rating-stars .fa-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// ============================================================================
// Delete Operations
// ============================================================================

async function deleteMedia(id) {
    if (!confirm('Are you sure you want to delete this item? It will be moved to trash.')) {
        return;
    }
    
    try {
        await window.electronAPI.softDeleteMedia(id);
        showNotification('Item moved to trash', 'is-success');
        await loadMedia();
    } catch (error) {
        console.error('Error deleting media:', error);
        showNotification('Error deleting item', 'is-danger');
    }
}

async function restoreMedia(id) {
    try {
        await window.electronAPI.restoreMedia(id);
        showNotification('Item restored', 'is-success');
        await loadTrash();
    } catch (error) {
        console.error('Error restoring media:', error);
        showNotification('Error restoring item', 'is-danger');
    }
}

async function permanentDeleteMedia(id) {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
        return;
    }
    
    try {
        await window.electronAPI.permanentDeleteMedia(id);
        showNotification('Item permanently deleted', 'is-success');
        await loadTrash();
    } catch (error) {
        console.error('Error permanently deleting media:', error);
        showNotification('Error deleting item', 'is-danger');
    }
}

// ============================================================================
// Filters
// ============================================================================

function getFilterOptions() {
    return {
        search: document.getElementById('searchInput').value.trim() || undefined,
        type: document.getElementById('typeFilter').value || undefined,
        minRating: document.getElementById('ratingFilter').value ? parseFloat(document.getElementById('ratingFilter').value) : undefined,
        brand: document.getElementById('brandFilter').value || undefined,
        system: document.getElementById('systemFilter').value || undefined,
    };
}

async function applyFilters() {
    await loadMedia();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('ratingFilter').value = '';
    document.getElementById('brandFilter').value = '';
    document.getElementById('systemFilter').value = '';
    applyFilters();
}

// ============================================================================
// Autocomplete
// ============================================================================

async function loadAutocompleteData() {
    try {
        const [brands, sizes, types] = await Promise.all([
            window.electronAPI.getBrands(),
            window.electronAPI.getSizes(),
            window.electronAPI.getTypes(),
        ]);
        
        // Populate brand datalist
        const brandList = document.getElementById('brandList');
        brandList.innerHTML = '';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            brandList.appendChild(option);
        });
        
        // Populate size datalist
        const sizeList = document.getElementById('sizeList');
        sizeList.innerHTML = '';
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size;
            sizeList.appendChild(option);
        });
        
        // Populate type filter
        const typeFilter = document.getElementById('typeFilter');
        const currentValue = typeFilter.value;
        typeFilter.innerHTML = '<option value="">All Types</option>';
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = formatType(type);
            typeFilter.appendChild(option);
        });
        typeFilter.value = currentValue;
        
        // Populate brand filter
        const brandFilter = document.getElementById('brandFilter');
        const currentBrandValue = brandFilter.value;
        brandFilter.innerHTML = '<option value="">All Brands</option>';
        brands.forEach(brand => {
            const option = document.createElement('option');
            option.value = brand;
            option.textContent = brand;
            brandFilter.appendChild(option);
        });
        brandFilter.value = currentBrandValue;
        
        // Populate system filter (get unique systems from current media)
        const systemFilter = document.getElementById('systemFilter');
        const currentSystemValue = systemFilter.value;
        const systems = [...new Set(currentMedia.filter(m => m.system).map(m => m.system))].sort();
        systemFilter.innerHTML = '<option value="">All Systems</option>';
        systems.forEach(system => {
            const option = document.createElement('option');
            option.value = system;
            option.textContent = system;
            systemFilter.appendChild(option);
        });
        systemFilter.value = currentSystemValue;
    } catch (error) {
        console.error('Error loading autocomplete data:', error);
    }
}

// ============================================================================
// Conditional Fields
// ============================================================================

function handleTypeChange() {
    const type = document.getElementById('typeInput').value;
    const brandField = document.getElementById('brandInput').closest('.column');
    const sizeField = document.getElementById('sizeInput').closest('.column');
    const systemField = document.getElementById('systemInput').closest('.column');
    
    // System field: show for video games
    if (type === 'video_game') {
        systemField.style.display = 'block';
    } else {
        systemField.style.display = 'none';
        document.getElementById('systemInput').value = '';
    }
    
    // Size field: show for sneakers
    if (type === 'sneakers') {
        sizeField.style.display = 'block';
    } else {
        sizeField.style.display = 'none';
        document.getElementById('sizeInput').value = '';
    }
    
    // Brand field: always visible but more relevant for some types
    brandField.style.display = 'block';
}

// ============================================================================
// Import/Export
// ============================================================================

async function exportData(format) {
    try {
        const includeDeleted = confirm('Include deleted items in export?');
        let data, filename, mimeType;
        
        if (format === 'json') {
            data = await window.electronAPI.exportJSON(includeDeleted);
            filename = `media-catalog-${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        } else {
            data = await window.electronAPI.exportCSV(includeDeleted);
            filename = `media-catalog-${new Date().toISOString().split('T')[0]}.csv`;
            mimeType = 'text/csv';
        }
        
        const filters = format === 'json' 
            ? [{ name: 'JSON Files', extensions: ['json'] }]
            : [{ name: 'CSV Files', extensions: ['csv'] }];
        
        const filePath = await window.electronAPI.saveFile(filename, filters);
        if (filePath) {
            await window.electronAPI.writeFile(filePath, data);
            showNotification(`Data exported successfully to ${filename}`, 'is-success');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Error exporting data', 'is-danger');
    }
}

async function importData(format) {
    try {
        const filters = format === 'json'
            ? [{ name: 'JSON Files', extensions: ['json'] }]
            : [{ name: 'CSV Files', extensions: ['csv'] }];
        
        const filePath = await window.electronAPI.openFile(filters);
        if (!filePath) {
            return;
        }
        
        const fileData = await window.electronAPI.readFile(filePath);
        let result;
        
        if (format === 'json') {
            result = await window.electronAPI.importJSON(fileData);
        } else {
            result = await window.electronAPI.importCSV(fileData);
        }
        
        if (result.errors && result.errors.length > 0) {
            showNotification(`Imported ${result.success} items. ${result.errors.length} errors occurred.`, 'is-warning');
            console.error('Import errors:', result.errors);
        } else {
            showNotification(`Successfully imported ${result.success} items`, 'is-success');
        }
        
        await loadMedia();
        await loadAutocompleteData();
    } catch (error) {
        console.error('Error importing data:', error);
        showNotification('Error importing data', 'is-danger');
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatType(type) {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function showNotification(message, type = 'is-info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type} notification-item`;
    notification.innerHTML = `
        <button class="delete" onclick="this.parentElement.remove()"></button>
        ${message}
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
