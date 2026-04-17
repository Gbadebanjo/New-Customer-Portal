import TextTemplatesScreen from "@/components/TextTemplates/TextTemplatesScreen";
import { requireAdminAuth } from "@/lib/auth/requireAdminAuth";

export default async function TextTemplatesPage() {
    await requireAdminAuth();
    return (
        <div>
            <TextTemplatesScreen/>
        </div>
    );
}
