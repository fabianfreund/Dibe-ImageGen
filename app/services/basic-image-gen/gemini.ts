interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
        inline_data?: {
          mime_type: string;
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

interface TextPart { 
  text: string; 
}

interface InlineDataPart {
  inline_data: {
    mime_type: string;
    data: string;
  };
}

type Part = TextPart | InlineDataPart;

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent';

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export const generateWithGemini = async (
  inputImages: string[],
  prompt: string,
  apiKey: string,
  retryCount: number = 0
): Promise<GenerationResult> => {
  try {
    // Prepare the request payload
    const parts: Part[] = [
      {
        text: prompt,
      },
    ];

    // Add images to the request with labels
    inputImages.forEach((imageData, index) => {
      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

      // Add image label
      parts.push({
        text: `Image ${index + 1}:`,
      });

      // Add image data
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Data,
        },
      });
    });

    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        maxOutputTokens: 4096,
      },
    };

    // Make the API request
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
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
          } else if (part.inline_data) {
            const { mime_type, data: imageData } = part.inline_data;
            generatedImages.push(`data:${mime_type};base64,${imageData}`);
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
        model: 'gemini-2.5-flash-image-preview',
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