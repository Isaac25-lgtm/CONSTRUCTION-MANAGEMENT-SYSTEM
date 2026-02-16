const API_URL = import.meta.env.VITE_AI_CHAT_URL || '';

const SYSTEM_PROMPT = `You are an internal project management assistant. Analyze timelines, risks, budgets, tasks, and milestones, then provide concise and actionable guidance.`;

export interface GeminiResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function askBuildProAI(
  userMessage: string,
  projectContext: object
): Promise<GeminiResponse> {
  if (!API_URL) {
    return {
      success: false,
      message: '',
      error: 'AI assistant is not configured. Configure VITE_AI_CHAT_URL to a backend endpoint.',
    };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        project_context: projectContext,
        system_prompt: SYSTEM_PROMPT,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || 'AI request failed');
    }

    const data = await response.json();

    if (data?.message) {
      return {
        success: true,
        message: data.message,
      };
    }

    throw new Error('Invalid AI response format');
  } catch (error) {
    console.error('AI service error:', error);
    return {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
