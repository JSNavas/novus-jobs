import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FallbackModel, type TextModel } from './client.js';

const answering = (text: string): TextModel => ({ models: { generateContent: async () => ({ text }) } });
const failing = (message: string): TextModel => ({ models: { generateContent: async () => { throw new Error(message); } } });

describe('FallbackModel', () => {
  it('a free model out of quota hands the call to the next one', async () => {
    const llm = new FallbackModel([
      { label: 'free', client: failing('429 rate-limited'), model: 'free' },
      { label: 'gemini', client: answering('[]'), model: 'gemini' },
    ]);
    assert.equal((await llm.models.generateContent({ model: 'x', contents: 'p' })).text, '[]');
  });

  it('each link is called with its own model, not the caller\'s', async () => {
    let seen = '';
    const spy: TextModel = { models: { generateContent: async (r) => { seen = r.model; return { text: 'ok' }; } } };
    await new FallbackModel([{ label: 'g', client: spy, model: 'gemini-x' }]).models.generateContent({ model: 'other', contents: 'p' });
    assert.equal(seen, 'gemini-x');
  });

  it('when every model fails, the last error reaches the caller', async () => {
    const llm = new FallbackModel([
      { label: 'a', client: failing('first'), model: 'a' },
      { label: 'b', client: failing('second'), model: 'b' },
    ]);
    await assert.rejects(llm.models.generateContent({ model: 'x', contents: 'p' }), /second/);
  });
});
