# Chatbox Option A Workaround

This document outlines the Option A workaround for the Vercel AI SDK chat component bug.

## The Bug

The `@ai-sdk/react` library in version 3/4 deprecated the direct `api` string option in the `useChat` hook, requiring the use of a `transport` layer, but the TypeScript compiler or Next.js build failed when destructuring `.content` off message objects that were using the newer `.parts` format.

## The Fix

We updated `src/components/dashboard/ticket-chat-client.tsx` to:
1. Pass `transport: new DefaultChatTransport({ api: ... })` instead of the legacy `api` option.
2. Implement a `getMessageText` helper that safely extracts text from `UIMessage` objects whether they use the legacy `content` string or the modern `parts` array.
3. Pass initial messages properly formatted.
4. Implement a graceful fallback error handler for the UI so that if the AI stream fails, the user is notified that a human will respond manually.

## Verification

The auto-trigger on initial ticket creation has been verified successfully via Puppeteer, as well as follow-up manual message streams. No React hydration errors exist, and the UI unlocks properly.
