"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
    return (
        <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
        >
            Sign Out
        </Button>
    );
}
