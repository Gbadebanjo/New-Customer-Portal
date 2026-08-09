import CustomersScreen from "@/components/Customers/CustomersScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { currentUserCanWrite } from "@/lib/auth/requireAdminAuth";
import { redirect } from "next/navigation";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    const canWrite = await currentUserCanWrite();
    return (
        <div className="w-full h-full">
            <CustomersScreen canWrite={canWrite} />
        </div>
    );
}
