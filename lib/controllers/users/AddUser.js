'use server'
import db from "@/database/models";
import {v4 as uuidv4} from "uuid";
import xss from "xss";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import AddUserToCustomerUserArray from "@/lib/controllers/customers/AddUserToCustomerUserArray";
import { forgotPassword } from '@/lib/auth/authActions';
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { logSecurityEvent } from "@/lib/services/logging/logSecurityEvent";
import { verifyAuth } from "@/lib/auth/auth";

function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default async function AddUser(formData) {
    try {
        const userName = xss(formData.get('UserName'));
        const surName = xss(formData.get('Surname'));
        const name = xss(formData.get('Name'));
        const email = xss(formData.get('Email')).toLowerCase();
        const phone = xss(formData.get('Phone'));
        const timezone = xss(formData.get('Timezone'));
        const ammpApiKey = xss(formData.get('AMMP_API_key'));
        const selectedCustomer = xss(formData.get('SelectedCustomer'));
        const roles = JSON.parse(formData.get('roles')).map(role => ({
            ...role,
            name: xss(String(role.name || '')),
        }));
        const sendInvitation = formData.get('UserInfo.SendConfirmationEmail') === 'true';

        // Server-side uniqueness check
        const existingUser = await db.User.findOne({
            where: { email: email }
        });
        if (existingUser) {
            return { error: "A user with this email address already exists." };
        }

        const existingUsername = await db.User.findOne({
            where: { username: userName }
        });
        if (existingUsername) {
            return { error: "This username is already taken." };
        }

        const userData = {
            id: uuidv4(),
            username: userName,
            email: email,
            phone_number: phone,
            name: toTitleCase(name),
            surname: toTitleCase(surName),
            ammp_api_key: ammpApiKey,
            customer: selectedCustomer,
            roles: roles,
            timezone: timezone,
            is_locked_out: false,
            not_active: false,
            email_confirmed: false,
            is_external: false,
            creation_time: new Date(),
            modification_time: new Date(),
        }

        const newUser = await db.User.create(userData);
        const { id } = newUser;

        if (sendInvitation) {
            const ForgotFormData = new FormData();
            ForgotFormData.append("email", newUser.email);
            await forgotPassword(ForgotFormData);
            await logSecurityEvent({ action: 'InvitationSent', userId: id, userName: email });
        }

        AddUserToCustomerUserArray(id, selectedCustomer);

        try {
            const { user: actor } = await verifyAuth();
            await logAuditEvent({
                name: 'User Created',
                userName: actor?.username || actor?.email || 'Unknown',
                url: '/admin/identity/users',
                method: 'POST',
                extra: { newUserId: id, newUserEmail: email },
            });
        } catch { /* non-fatal */ }

        revalidatePath('/admin/identity/users');
        redirect('/admin/identity/users');
    } catch (error) {
        // allow Next's redirect control flow to propagate
        if (error && typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
            throw error;
        }
        console.error(error);
        return { error: "Failed to create user. Please try again." };
    }
}
