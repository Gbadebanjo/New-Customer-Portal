import SupportScreen from "@/components/Support/SupportScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <SupportScreen userId={result.user.id} />
        </div>
    );
}
