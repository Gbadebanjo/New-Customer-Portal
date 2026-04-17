import {verifyAuth} from "@/lib/auth/auth";
import {redirect} from "next/navigation";
import nookies from "nookies";
import ProfileScreen from "@/components/Profile/ProfileScreen";
import verify2FA from "@/lib/controllers/users/verify2FA";


export default async function Profile(req) {
    //authentication
    const cookies = nookies.get({ req });
    const result = await verifyAuth(cookies);
    

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <ProfileScreen/>
        </div>
    );
}

