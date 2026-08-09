'use server'
import db from "@/database/models";
import {v4 as uuidv4} from "uuid";
import xss from "xss";
import {revalidatePath} from "next/cache";
import AddUserToCustomerUserArray from "@/lib/controllers/customers/AddUserToCustomerUserArray";
import { generateInviteLink } from '@/lib/auth/verificationActions';
import { logAuditEvent } from "@/lib/services/logging/logAuditEvent";
import { logSecurityEvent } from "@/lib/services/logging/logSecurityEvent";
import { verifyAuth } from "@/lib/auth/auth";
import { requireWriteAdminAuth } from "@/lib/auth/requireAdminAuth";

function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default async function AddUser(formData) {
    try {
        const gate = await requireWriteAdminAuth();
        if (!gate.ok) return { error: gate.error };

        const userName = xss(formData.get('UserName'));
        const surName = xss(formData.get('Surname'));
        const name = xss(formData.get('Name'));
        const email = xss(formData.get('Email')).toLowerCase();
        const phone = xss(formData.get('Phone'));
        const timezone = xss(formData.get('Timezone'));
        const selectedCustomer = xss(formData.get('SelectedCustomer'));
        const roles = JSON.parse(formData.get('roles')).map(role => ({
            ...role,
            name: xss(String(role.name || '')),
        }));
        const sendInvitation = formData.get('UserInfo.SendConfirmationEmail') === 'true';

        // Daystar-side roles see every site (fleet). Any other role is a
        // customer-scoped user and MUST have a customer_id attached — that
        // is how we know which sites to show them once the master key gives
        // us the full fleet.
        const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);
        const isDaystarRole = roles.some((r) => DAYSTAR_ROLES.has(r?.name));
        if (!isDaystarRole && !selectedCustomer) {
            return { error: 'Please assign this user to a customer. Only Daystar admin roles can be created without one.' };
        }

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
            await generateInviteLink(id, newUser.email);
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
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Failed to create user. Please try again." };
    }
}
