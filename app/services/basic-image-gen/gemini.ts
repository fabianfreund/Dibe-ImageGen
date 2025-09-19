interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

interface GenerationResult {
  success: boolean;
  images?: string[]; // base64 encoded images
  error?: string;
  metadata?: {
    model: string;
    timestamp: Date;
    prompt: string;
  };
}

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const generateWithGemini = async (
  inputImages: string[],
  prompt: string,
  apiKey: string,
  retryCount: number = 0
): Promise<GenerationResult> => {
  try {
    // Prepare the request payload
    const parts = [
      {
        text: prompt,
      },
    ];

    // Add images to the request
    for (const imageData of inputImages) {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const mimeType = imageData.match(/^data:image\/([a-z]+);base64,/)?.[1];

      parts.push({
        inlineData: {
          mimeType: `image/${mimeType || 'jpeg'}`,
          data: base64Data,
        },
      });
    }

    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    };

    // Make the API request
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Handle rate limiting with exponential backoff
      if (response.status === 429 && retryCount < 3) {
        const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await delay(backoffMs);
        return generateWithGemini(inputImages, prompt, apiKey, retryCount + 1);
      }

      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const data: GeminiResponse = await response.json();

    // Check for API errors
    if (data.error) {
      const { code, message, status } = data.error;

      // Handle specific error types
      if (code === 400 && message.includes('API key')) {
        throw new Error('Invalid API key. Please check your Gemini API key in settings.');
      }

      if (code === 429) {
        throw new Error('Rate limit reached. Please try again in a few moments.');
      }

      if (status === 'INVALID_ARGUMENT' && message.includes('safety')) {
        throw new Error('The content was flagged by safety filters. Please try adjusting your prompt.');
      }

      throw new Error(`Gemini API error: ${message}`);
    }

    // Extract generated images from response
    const generatedImages: string[] = [];

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const { mimeType, data: imageData } = part.inlineData;
            generatedImages.push(`data:${mimeType};base64,${imageData}`);
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      throw new Error('No images were generated. The model may not have understood the request.');
    }

    return {
      success: true,
      images: generatedImages,
      metadata: {
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date(),
        prompt,
      },
    };

  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during generation',
    };
  }
};