"use client";

import { Button } from "@/components/ui/button";

export default function SignOutButton() {
    return (
        <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => window.location.href = "/api/auth/logout"}
        >
            Sign Out
        </Button>
    );
}
