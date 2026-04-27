import ReportsScreen from "@/components/Reports/ReportsScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <ReportsScreen userId={result.user.id} />
        </div>
    );
}
