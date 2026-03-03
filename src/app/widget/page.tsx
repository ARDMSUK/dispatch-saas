import WidgetChatClient from "@/components/widget/widget-chat-client";

export default async function WidgetPage(
    props: {
        searchParams: Promise<{ key?: string }>;
    }
) {
    // Next.js 15 passes searchParams as a Promise
    const searchParams = await props.searchParams;
    const key = searchParams.key;

    return (
        <div className="w-full h-full bg-transparent overflow-hidden">
            <WidgetChatClient apiKeyPromise={Promise.resolve(key)} />
        </div>
    );
}
