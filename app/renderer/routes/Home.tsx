import React, { useState, useEffect } from 'react';

interface PromptPreset {
  name: string;
  tags: string[];
  prompt: string;
}

const Home: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
  const [presets, setPresets] = useState<PromptPreset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      const loadedPresets = await window.electronAPI.presets.get();
      setPresets(loadedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedImages(files);
  };

  const handlePresetSelect = (preset: PromptPreset) => {
    setSelectedPreset(preset);
    setPrompt(preset.prompt);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || selectedImages.length === 0) {
      alert('Please select images and enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Preparing images...');
    setGeneratedImages([]);

    try {
      // Save uploaded files to temporary directory
      const imagePaths: string[] = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        setGenerationStatus(`Preparing image ${i + 1}/${selectedImages.length}...`);

        const buffer = await file.arrayBuffer();
        const tempPath = await window.electronAPI.file.saveTemp(buffer, `upload_${Date.now()}_${i}_${file.name}`);
        imagePaths.push(tempPath);
      }

      setGenerationStatus('Starting AI generation...');

      const result = await window.electronAPI.service.generate('basic-image-gen', {
        images: imagePaths,
        prompt: prompt.trim(),
      });

      if (result.success && result.images) {
        setGeneratedImages(result.images);
        setGenerationStatus('Generation complete!');
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationStatus('Generation failed');
      alert(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveImage = async (imageData: string, index: number) => {
    try {
      const filename = `generated_image_${Date.now()}_${index + 1}.png`;
      const savedPath = await window.electronAPI.file.saveImage(imageData, filename);
      alert(`Image saved to: ${savedPath}`);
    } catch (error) {
      console.error('Failed to save image:', error);
      alert('Failed to save image');
    }
  };

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Generate Images</h1>

          {/* Image upload area */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Images</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="text-gray-500">
                  <svg className="mx-auto h-12 w-12 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm">Click to upload images or drag and drop</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                </div>
              </label>
            </div>

            {selectedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{selectedImages.length} image(s) selected:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((file, index) => (
                    <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {file.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Prompt input */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || selectedImages.length === 0}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate Images'}
          </button>

          {/* Generation status */}
          {isGenerating && generationStatus && (
            <div className="mt-4 p-3 bg-primary/10 text-primary rounded-lg text-sm">
              {generationStatus}
            </div>
          )}

          {/* Generated images */}
          {generatedImages.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Generated Images</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((imageData, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={imageData}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-auto"
                    />
                    <div className="p-3 bg-gray-50">
                      <button
                        onClick={() => saveImage(imageData, index)}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Save Image
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Presets sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Prompt Presets</h3>

        <div className="space-y-3">
          {presets.map((preset, index) => (
            <div
              key={index}
              onClick={() => handlePresetSelect(preset)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedPreset?.name === preset.name
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-medium text-gray-900 mb-1">{preset.name}</h4>
              <div className="flex flex-wrap gap-1 mb-2">
                {preset.tags.map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">{preset.prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;