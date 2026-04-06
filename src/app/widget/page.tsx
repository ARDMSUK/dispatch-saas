import WidgetChatClient from "@/components/widget/widget-chat-client";

export default async function WidgetPage(
    props: {
        searchParams: Promise<{ key?: string; color?: string }>;
    }
) {
    // Next.js 15 passes searchParams as a Promise
    const searchParams = await props.searchParams;
    const key = searchParams.key;
    const color = searchParams.color || '#1d4ed8'; // default blue

    return (
        <div className="w-full h-full bg-transparent overflow-hidden">
            <style dangerouslySetInnerHTML={{ __html: `
                html, body {
                    background-color: transparent !important;
                    font-family: var(--font-geist-sans), sans-serif;
                }
            `}} />
            <WidgetChatClient apiKey={key} color={color} />
        </div>
    );
}
