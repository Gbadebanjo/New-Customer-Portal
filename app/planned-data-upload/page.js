import PlannedUploadsScreen from "@/components/PlannedUploads/PlannedUploadsScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <PlannedUploadsScreen/>
        </div>
    );
}

export default Page;
