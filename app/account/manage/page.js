import { verifyAuth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import ProfileScreen from "@/components/Profile/ProfileScreen";

export default async function Profile() {
    const result = await verifyAuth();

    if (!result.user) {
        return redirect('/');
    }
    return (
        <div>
            <ProfileScreen/>
        </div>
    );
}
