import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function test() {
  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log(Object.keys(result));
    console.log(result.toAIStreamResponse ? 'Has toAIStreamResponse' : 'No toAIStreamResponse');
  } catch (e) {
    console.error("Error caught:", e);
  }
}
test();
