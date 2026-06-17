const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'src/components/dashboard/ticket-chat-client.tsx');
let clientCode = fs.readFileSync(clientPath, 'utf8');

clientCode = clientCode.replace(
  `export default function TicketChatClient({ ticketId, subject, status, initialMessages }: ChatProps) {`,
  `export default function TicketChatClient({ ticketId, subject, status, initialMessages }: ChatProps) {
    console.log("[DEBUG] TicketChatClient mounted. TicketID:", ticketId, "Status:", status);
    console.log("[DEBUG] initialMessages state:", initialMessages);`
);

clientCode = clientCode.replace(
  `const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } = useChat(`,
  `const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } = useChat(`
);

// We need to carefully replace the onSubmit to log it
clientCode = clientCode.replace(
  `<form
                    onSubmit={handleSubmit}`,
  `<form
                    onSubmit={(e) => {
                        console.log("[DEBUG] form onSubmit triggered. Input:", input, "isLoading:", isLoading);
                        handleSubmit(e);
                    }}`
);

// add log inside useChat onError
clientCode = clientCode.replace(
  `onError: (err) => {
            console.error("Chat Error:", err);`,
  `onError: (err) => {
            console.error("[DEBUG] Chat Error caught by useChat:", err);`
);

// add log inside useEffect for auto-trigger
clientCode = clientCode.replace(
  `if (!hasTriggeredRef.current && isBrandNewPending) {`,
  `if (!hasTriggeredRef.current && isBrandNewPending) {
            console.log("[DEBUG] Auto-trigger condition met. Preparing append().");`
);

clientCode = clientCode.replace(
  `setTimeout(() => {
                const firstMsg = initialMessages[0];
                append({`,
  `setTimeout(() => {
                const firstMsg = initialMessages[0];
                console.log("[DEBUG] Before append(), firstMsg:", firstMsg);
                append({`
);

clientCode = clientCode.replace(
  `content: firstMsg.content
                }).catch(err => console.error("Failed to auto-append:", err));`,
  `content: firstMsg.content
                }).then(() => console.log("[DEBUG] After append() resolved")).catch(err => console.error("[DEBUG] Failed to auto-append:", err));`
);

clientCode = clientCode.replace(
  `className="bg-indigo-600 hover:bg-purple-600 text-black shrink-0"
                    >`,
  `className="bg-indigo-600 hover:bg-purple-600 text-black shrink-0"
                        onClick={() => console.log("[DEBUG] Send button clicked. Disabled state:", !(input || '').trim() || isLoading || status === 'CLOSED')}
                    >`
);

fs.writeFileSync(clientPath, clientCode);

const serverPath = path.join(__dirname, 'src/app/api/support/tickets/[id]/chat/route.ts');
let serverCode = fs.readFileSync(serverPath, 'utf8');

serverCode = serverCode.replace(
  `export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {`,
  `export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        console.log("[DEBUG-SERVER] POST /api/support/tickets/[id]/chat hit!");`
);

serverCode = serverCode.replace(
  `const { messages } = await req.json();`,
  `const { messages } = await req.json();
        console.log("[DEBUG-SERVER] Received payload messages:", JSON.stringify(messages).substring(0, 200));`
);

serverCode = serverCode.replace(
  `// 4. Stream the text from OpenAI`,
  `// 4. Stream the text from OpenAI
        console.log("[DEBUG-SERVER] Starting streamText from OpenAI...");`
);

serverCode = serverCode.replace(
  `return result.toUIMessageStreamResponse();`,
  `console.log("[DEBUG-SERVER] Returning toUIMessageStreamResponse()");
        return result.toUIMessageStreamResponse();`
);

serverCode = serverCode.replace(
  `catch (error: any) {`,
  `catch (error: any) {
        console.error("[DEBUG-SERVER] Caught error in route:", error);`
);

fs.writeFileSync(serverPath, serverCode);
console.log("Debug logs injected.");
