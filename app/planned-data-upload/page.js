import PlannedUploadsScreen from "@/components/PlannedUploads/PlannedUploadsScreen";
import {verifyAuth} from "@/lib/auth/auth";
import {redirect} from "next/navigation";
import nookies from "nookies";


async function Page(req) {
    //authentication
    const cookies = nookies.get({ req });
    const result = await verifyAuth(cookies);

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <PlannedUploadsScreen/>
        </div>
    );
}

export default Page
