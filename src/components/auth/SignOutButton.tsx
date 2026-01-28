"use client";

import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

export default function SignOutButton() {
    return (
        <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => logout()}
        >
            Sign Out
        </Button>
    );
}
