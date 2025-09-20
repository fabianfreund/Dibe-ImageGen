import React, { useState, useEffect } from 'react';
import { formatFileSize, formatDate, getRelativeTime, truncateText, searchLibraryItems, sortLibraryItems, generateSafeFilename } from '../../services/core/libraryUtils';

interface LibraryItem {
  id: string;
  timestamp: number;
  prompt: string;
  imagePath: string;
  originalFilename: string;
  fileSize: number;
  imageFormat: string;
}

const Library: React.FC = () => {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'largest' | 'smallest'>('newest');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Thumbnail cache
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const [loadingThumbnails, setLoadingThumbnails] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<LibraryItem | null>(null);
  const [selectedImageData, setSelectedImageData] = useState<string>('');

  useEffect(() => {
    loadLibrary();
  }, []);

  useEffect(() => {
    // Filter and sort items when search term or sort criteria changes
    let filtered = searchLibraryItems(libraryItems, searchTerm);
    filtered = sortLibraryItems(filtered, sortBy);
    setFilteredItems(filtered);
  }, [libraryItems, searchTerm, sortBy]);

  useEffect(() => {
    // Load thumbnails for library items
    loadThumbnails();
  }, [libraryItems]);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const items = await window.electronAPI.library.get();
      setLibraryItems(items);
    } catch (error) {
      console.error('Failed to load library:', error);
      alert('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const loadThumbnails = async () => {
    // Load thumbnails for items not already in cache
    const itemsToLoad = libraryItems.filter(item => !thumbnailCache.has(item.id));

    for (const item of itemsToLoad) {
      if (loadingThumbnails.has(item.id)) continue;

      setLoadingThumbnails(prev => new Set(prev).add(item.id));

      try {
        const imageData = await window.electronAPI.library.getImageData(item.id);
        setThumbnailCache(prev => new Map(prev).set(item.id, imageData));
      } catch (error) {
        console.error(`Failed to load thumbnail for ${item.id}:`, error);
      } finally {
        setLoadingThumbnails(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }
    }
  };

  const handleImageClick = async (item: LibraryItem) => {
    try {
      // Use cached image data if available, otherwise load it
      let imageData = thumbnailCache.get(item.id);
      if (!imageData) {
        imageData = await window.electronAPI.library.getImageData(item.id);
        setThumbnailCache(prev => new Map(prev).set(item.id, imageData!));
      }
      setSelectedImage(item);
      setSelectedImageData(imageData);
      setModalOpen(true);
    } catch (error) {
      console.error('Failed to load image:', error);
      alert('Failed to load image');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedImage(null);
    setSelectedImageData('');
  };

  const downloadImage = async (item: LibraryItem) => {
    try {
      const suggestedFilename = generateSafeFilename(item.prompt, item.timestamp, item.imageFormat);
      const savedPath = await window.electronAPI.library.download(item.id, suggestedFilename);
      alert(`Image downloaded to: ${savedPath}`);
    } catch (error) {
      console.error('Failed to download image:', error);
      alert('Failed to download image');
    }
  };

  const removeImage = async (item: LibraryItem) => {
    if (!confirm(`Are you sure you want to remove "${truncateText(item.prompt, 50)}" from your library? This cannot be undone.`)) {
      return;
    }

    try {
      const success = await window.electronAPI.library.remove(item.id);
      if (success) {
        await loadLibrary();
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      } else {
        alert('Failed to remove image from library');
      }
    } catch (error) {
      console.error('Failed to remove image:', error);
      alert('Failed to remove image from library');
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(filteredItems.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const removeSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to remove ${selectedItems.size} image${selectedItems.size === 1 ? '' : 's'} from your library? This cannot be undone.`)) {
      return;
    }

    try {
      const promises = Array.from(selectedItems).map(id => window.electronAPI.library.remove(id));
      await Promise.all(promises);
      await loadLibrary();
      clearSelection();
    } catch (error) {
      console.error('Failed to remove selected images:', error);
      alert('Failed to remove some images from library');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Image Library</h1>
          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by prompt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="largest">Largest First</option>
              <option value="smallest">Smallest First</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedItems.size} selected
              </span>
              <button
                onClick={removeSelectedItems}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
              >
                Remove Selected
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600">
          <span>{filteredItems.length} image{filteredItems.length === 1 ? '' : 's'}</span>
          {filteredItems.length !== libraryItems.length && (
            <span>({libraryItems.length} total)</span>
          )}
          <span>
            Total size: {formatFileSize(libraryItems.reduce((sum, item) => sum + item.fileSize, 0))}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No images found' : 'No images in library'}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? `Try a different search term`
                : 'Generated images will appear here when you save them to your library'
              }
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 ${
                  selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                </div>

                {/* Image Thumbnail */}
                <div
                  className="relative aspect-square bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() => handleImageClick(item)}
                >
                  {thumbnailCache.has(item.id) ? (
                    <img
                      src={thumbnailCache.get(item.id)}
                      alt={item.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  ) : loadingThumbnails.has(item.id) ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                    <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  <p className="text-xs text-gray-500 mb-1">{getRelativeTime(item.timestamp)}</p>
                  <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                    {truncateText(item.prompt, 60)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span className="uppercase">{item.imageFormat}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-1 mt-2">
                    <button
                      onClick={() => downloadImage(item)}
                      className="flex-1 px-2 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90 transition-colors"
                      title="Download"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => removeImage(item)}
                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {/* Select All */}
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={filteredItems.length > 0 && selectedItems.size === filteredItems.length}
                onChange={selectedItems.size === filteredItems.length ? clearSelection : selectAllItems}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary mr-3"
              />
              <span className="text-sm text-gray-600">Select all</span>
            </div>

            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 ${
                  selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                {/* Selection */}
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => toggleItemSelection(item.id)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary mr-4"
                />

                {/* Image Thumbnail */}
                <div
                  className="w-16 h-16 bg-gray-100 rounded cursor-pointer overflow-hidden mr-4 flex items-center justify-center"
                  onClick={() => handleImageClick(item)}
                >
                  {thumbnailCache.has(item.id) ? (
                    <img
                      src={thumbnailCache.get(item.id)}
                      alt={item.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  ) : loadingThumbnails.has(item.id) ? (
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate mb-1">
                    {truncateText(item.prompt, 80)}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatDate(item.timestamp)}</span>
                    <span>{formatFileSize(item.fileSize)}</span>
                    <span className="uppercase">{item.imageFormat}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => downloadImage(item)}
                    className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => removeImage(item)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {modalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {selectedImage.originalFilename}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedImage.timestamp)} • {formatFileSize(selectedImage.fileSize)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Image */}
              {selectedImageData && (
                <img
                  src={selectedImageData}
                  alt={selectedImage.originalFilename}
                  className="max-w-full max-h-96 mx-auto object-contain rounded"
                />
              )}

              {/* Prompt */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Prompt:</h4>
                <p className="text-sm text-gray-700">{selectedImage.prompt}</p>
              </div>

              {/* Actions */}
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Download Image
                </button>
                <button
                  onClick={() => {
                    removeImage(selectedImage);
                    closeModal();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove from Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;