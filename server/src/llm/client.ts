/**
 * The one shape every model call in the server uses. Google's SDK already has
 * it (`client.models.generateContent`), so Gemini plugs in as is; the
 * OpenAI-compatible providers get a small adapter below.
 */
export interface TextModel {
  models: {
    generateContent(request: { model: string; contents: string }): Promise<{ text?: string | undefined }>;
  };
}

const REQUEST_TIMEOUT_MS = 180_000;

/**
 * Any `/chat/completions` endpoint (OpenRouter, NVIDIA NIM, a local proxy).
 * It answers with its own model: the name the caller passes is Gemini's and
 * means nothing here.
 */
export class OpenAiCompatibleModel implements TextModel {
  readonly models = { generateContent: (request: { model: string; contents: string }) => this.complete(request.contents) };

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  private async complete(prompt: string): Promise<{ text: string }> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: [{ role: 'user', content: prompt }], temperature: 0 }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`${response.status} ${this.model}: ${body.slice(0, 200)}`);
    const parsed = JSON.parse(body) as { choices?: { message?: { content?: string | null } }[]; error?: { message?: string } };
    if (parsed.error) throw new Error(`${this.model}: ${parsed.error.message ?? 'error'}`);
    const text = parsed.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${this.model}: empty answer`);
    return { text };
  }
}

export interface ModelLink {
  readonly label: string;
  readonly client: TextModel;
  readonly model: string;
}

/**
 * Tries each model in order and keeps the first answer. A free model that runs
 * out of quota hands the call to the next one instead of leaving the rules alone.
 */
export class FallbackModel implements TextModel {
  readonly models = {
    generateContent: async (request: { model: string; contents: string }): Promise<{ text?: string | undefined }> => {
      let last: unknown = new Error('no model configured');
      for (const link of this.links) {
        try {
          return await link.client.models.generateContent({ model: link.model, contents: request.contents });
        } catch (error) {
          last = error;
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`[llm] ${link.label} falló (${message.slice(0, 120)}); paso al siguiente`);
        }
      }
      throw last;
    },
  };

  constructor(private readonly links: readonly ModelLink[]) {}

  describe(): string {
    return this.links.map((l) => l.label).join(' → ');
  }
}
