import { Suspense } from "react";
import WidgetChatClient from "@/components/widget/widget-chat-client";

export default function WidgetPage({
    searchParams,
}: {
    searchParams: { key?: string };
}) {
    // We expect ?key=TENANT_API_KEY
    // The Suspense boundary is needed for searchParams usage
    // although Next.js 15 does not strictly require it for page props,
    // it's good practice. Wait, Next.js 15 searchParams is a promise!

    return (
        <div className="w-full h-full bg-transparent overflow-hidden">
            <WidgetChatClient apiKeyPromise={Promise.resolve(searchParams.key)} />
        </div>
    );
}
