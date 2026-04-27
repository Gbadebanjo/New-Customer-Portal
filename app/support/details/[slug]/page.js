import {verifyAuth} from "@/lib/auth/auth";
import {redirect} from "next/navigation";
import SupportDetailsScreen from "@/components/SupportDetailsScreen/SupportDetailsScreen";

export default async function Page({params}) {
    const result = await verifyAuth();
    if (!result.user) {
        return redirect('/');
    }
    const { slug } = await params;
    return (
        <div>
            <SupportDetailsScreen
                support_id ={slug}
            />
        </div>
    );
}

