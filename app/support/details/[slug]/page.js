import {verifyAuth} from "@/lib/auth/auth";
import {redirect} from "next/navigation";
import SupportDetailsScreen from "@/components/SupportDetailsScreen/SupportDetailsScreen";

export default async function Page({params}) {
    //authentication
    // const cookies = nookies.get();
    // const result = await verifyAuth();

    // if (!result.user) {
    //     return redirect('/');
    // }
    const { slug } = params;
    return (
        <div>
            <SupportDetailsScreen
                support_id ={slug}
            />
        </div>
    );
}

