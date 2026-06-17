import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function test() {
  try {
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log("Result created");
    // Since API key is missing, it will throw, but let's see if the function exists
    console.log("typeof toUIMessageStreamResponse:", typeof result.toUIMessageStreamResponse);
    if (typeof result.toUIMessageStreamResponse === 'function') {
        const response = result.toUIMessageStreamResponse();
        console.log("Headers:", response.headers.get('Content-Type'));
    }
  } catch (e) {
    console.error("Error caught:", e);
  }
}
test();
