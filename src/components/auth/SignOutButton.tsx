import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";

export default function SignOutButton() {
    return (
        <form action={logout}>
            <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs px-2"
                type="submit"
            >
                Sign Out
            </Button>
        </form>
    );
}
