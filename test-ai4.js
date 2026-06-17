import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function test() {
  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log("Result created");
    const response = result.toTextStreamResponse();
    console.log("Response created:", response.status);
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      console.log("Chunk:", new TextDecoder().decode(value));
    }
  } catch (e) {
    console.error("Error caught:", e);
  }
}
test();
