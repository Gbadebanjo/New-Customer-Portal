import CustomersScreen from "@/components/Customers/CustomersScreen";
import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";

export default async function Page() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div className="w-full h-full">
            <CustomersScreen/>
        </div>
    );
}
