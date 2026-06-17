const fs = require('fs');
const path = require('path');

const clientPath = path.join(__dirname, 'src/components/dashboard/ticket-chat-client.tsx');
let clientCode = fs.readFileSync(clientPath, 'utf8');

clientCode = clientCode.replace(
  `const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } = useChat`,
  `const chatState = useChat({
        api: \`/api/support/tickets/\${ticketId}/chat\`,
        initialMessages: startingMessages,
        onError: (err) => {
            console.error("[DEBUG] Chat Error caught by useChat:", err);
        }
    });
    console.log("[DEBUG] useChat returned keys:", Object.keys(chatState));
    const { messages, input, handleInputChange, handleSubmit, isLoading, append, setMessages } = chatState;`
);

clientCode = clientCode.replace(
  `({
        api: \`/api/support/tickets/\${ticketId}/chat\`,
        initialMessages: startingMessages,
        onError: (err) => {
            console.error("[DEBUG] Chat Error caught by useChat:", err);
        }
    });`,
  ``
);

fs.writeFileSync(clientPath, clientCode);
console.log("Patched to inspect useChat");
