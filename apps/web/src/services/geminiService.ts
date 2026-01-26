const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const SYSTEM_PROMPT = `You are BuildPro AI, an intelligent construction project management assistant for Uganda's construction industry. You help project managers, site supervisors, and stakeholders with:

CAPABILITIES:
1. Project Analysis: Analyze project data including timelines, budgets, tasks, and milestones
2. Risk Assessment: Identify potential risks, suggest mitigation strategies, calculate risk scores
3. Budget Advice: Track spending, predict overruns, suggest cost-saving measures
4. Schedule Optimization: Identify critical paths, suggest task reordering, flag delays
5. Uganda Construction Context: Provide advice specific to Uganda's construction industry

UGANDA CONSTRUCTION KNOWLEDGE:
- Currency: Uganda Shillings (UGX)
- Key regulatory bodies: UNRA, KCCA, Ministry of Works
- Common challenges: Rainy seasons (March-May, Sept-Nov), material price fluctuations, forex impacts
- Major suppliers: Roofings Group, Hima Cement, Steel & Tube Industries
- Labor considerations: Local labor rates, skill availability, safety regulations
- Common project types: Roads, residential, commercial, institutional buildings

RESPONSE STYLE:
- Be concise but thorough
- Use bullet points for clarity
- Include specific numbers/percentages when relevant
- Always relate advice to Uganda's context when applicable
- Suggest actionable next steps
- Flag urgent risks prominently

When given project data, analyze it and provide insights. When asked general questions, draw from Uganda construction industry knowledge.`;

export interface GeminiResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function askBuildProAI(
  userMessage: string,
  projectContext: object
): Promise<GeminiResponse> {
  try {
    const fullPrompt = `${SYSTEM_PROMPT}

PROJECT CONTEXT:
${JSON.stringify(projectContext, null, 2)}

USER QUESTION: ${userMessage}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      return {
        success: true,
        message: data.candidates[0].content.parts[0].text
      };
    }

    throw new Error('Invalid response format from API');
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
