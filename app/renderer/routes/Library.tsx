import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatFileSize, formatDate, getRelativeTime, truncateText, searchLibraryItems, sortLibraryItems, generateSafeFilename } from '../../services/core/libraryUtils';
import ImageEditorModal from '../components/ImageEditorModal';

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
  const navigate = useNavigate();
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
  const [showPrompt, setShowPrompt] = useState(false);

  // Download state
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());
  const [downloadedItems, setDownloadedItems] = useState<Set<string>>(new Set());

  // Image editor state
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editorImageData, setEditorImageData] = useState<string>('');
  const [editorImageName, setEditorImageName] = useState<string>('');

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
    setShowPrompt(false);
  };

  const downloadImage = async (item: LibraryItem) => {
    try {
      setDownloadingItems(prev => new Set(prev).add(item.id));
      const suggestedFilename = generateSafeFilename(item.prompt, item.timestamp, item.imageFormat);
      await window.electronAPI.library.download(item.id, suggestedFilename);

      // Show success state
      setDownloadedItems(prev => new Set(prev).add(item.id));

      // Reset success state after 2 seconds
      setTimeout(() => {
        setDownloadedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to download image:', error);
      // Could add error state here if needed
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const getDownloadButtonContent = (itemId: string, variant: 'small' | 'large' = 'small') => {
    const isDownloading = downloadingItems.has(itemId);
    const isDownloaded = downloadedItems.has(itemId);

    if (isDownloading) {
      return variant === 'large' ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          Downloading...
        </>
      ) : 'Downloading...';
    }

    if (isDownloaded) {
      return variant === 'large' ? (
        <>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Downloaded
        </>
      ) : 'Downloaded ✓';
    }

    return variant === 'large' ? 'Download Image' : 'Download';
  };

  const openImageEditor = async (item: LibraryItem) => {
    try {
      // Use cached image data if available, otherwise load it
      let imageData = thumbnailCache.get(item.id);
      if (!imageData) {
        imageData = await window.electronAPI.library.getImageData(item.id);
        setThumbnailCache(prev => new Map(prev).set(item.id, imageData!));
      }
      setEditorImageData(imageData);
      setEditorImageName(item.originalFilename);
      setEditorModalOpen(true);
    } catch (error) {
      console.error('Failed to open image editor:', error);
    }
  };

  const handleSaveCroppedImage = async (croppedImageData: string, filename: string) => {
    try {
      // Add cropped image to library
      const prompt = selectedImage?.prompt || 'Cropped image';
      await window.electronAPI.library.add(croppedImageData, prompt, filename);

      // Reload library to show the new image
      await loadLibrary();

      // Close editor
      setEditorModalOpen(false);
    } catch (error) {
      console.error('Failed to save cropped image:', error);
    }
  };

  const reusePrompt = async (item: LibraryItem) => {
    try {
      // Get image data for the item
      let imageData = thumbnailCache.get(item.id);
      if (!imageData) {
        imageData = await window.electronAPI.library.getImageData(item.id);
      }

      // Navigate to home with both prompt and image data as URL parameters
      const encodedPrompt = encodeURIComponent(item.prompt);
      const encodedImageData = encodeURIComponent(imageData);
      navigate(`/?prompt=${encodedPrompt}&image=${encodedImageData}`);
    } catch (error) {
      console.error('Failed to reuse prompt and image:', error);
      // Fallback to just prompt if image loading fails
      const encodedPrompt = encodeURIComponent(item.prompt);
      navigate(`/?prompt=${encodedPrompt}`);
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
                      disabled={downloadingItems.has(item.id)}
                      className={`flex-1 px-2 py-1 rounded text-xs transition-colors ${
                        downloadedItems.has(item.id)
                          ? 'bg-green-600 text-white'
                          : downloadingItems.has(item.id)
                          ? 'bg-primary/70 text-white cursor-not-allowed'
                          : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                      title="Download"
                    >
                      {getDownloadButtonContent(item.id)}
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
                    disabled={downloadingItems.has(item.id)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      downloadedItems.has(item.id)
                        ? 'bg-green-600 text-white'
                        : downloadingItems.has(item.id)
                        ? 'bg-primary/70 text-white cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {getDownloadButtonContent(item.id)}
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

              {/* Prompt Toggle */}
              <div className="mt-4">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {showPrompt ? 'Hide Prompt' : 'Show Prompt'}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-600 transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPrompt && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">{selectedImage.prompt}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 bg-gray-50 -mx-4 -mb-4 p-4 border-t border-gray-200">
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-3 w-full max-w-lg">
                    {/* Reuse Button */}
                    <button
                      onClick={() => reusePrompt(selectedImage)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-purple-600 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Reuse</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openImageEditor(selectedImage)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                    >
                      <svg className="w-4 h-4 text-blue-600 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => downloadImage(selectedImage)}
                      disabled={downloadingItems.has(selectedImage.id)}
                      className={`flex-1 inline-flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                        downloadedItems.has(selectedImage.id)
                          ? 'bg-green-600 text-white border border-green-600'
                          : downloadingItems.has(selectedImage.id)
                          ? 'bg-primary/70 text-white border border-primary/70 cursor-not-allowed'
                          : 'bg-primary text-white border border-primary hover:bg-primary/90 hover:shadow-md'
                      }`}
                    >
                      {downloadingItems.has(selectedImage.id) ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin sm:mr-2"></div>
                      ) : downloadedItems.has(selectedImage.id) ? (
                        <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">
                        {downloadingItems.has(selectedImage.id) ? 'Downloading...' : downloadedItems.has(selectedImage.id) ? 'Downloaded' : 'Download'}
                      </span>
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => {
                        removeImage(selectedImage);
                        closeModal();
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-lg text-gray-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all duration-200 shadow-sm"
                      title="Remove from Library"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      <ImageEditorModal
        isOpen={editorModalOpen}
        imageData={editorImageData}
        imageName={editorImageName}
        onClose={() => setEditorModalOpen(false)}
        onSave={handleSaveCroppedImage}
      />
    </div>
  );
};

export default Library;