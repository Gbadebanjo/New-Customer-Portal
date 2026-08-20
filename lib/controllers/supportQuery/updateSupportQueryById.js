'use server'
import db from '@/database/models';
import { revalidatePath } from "next/cache";
import { verifyAuth } from "@/lib/auth/auth";

const DAYSTAR_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Editable columns on a support ticket. `user_id` is deliberately
// locked (reassigning ownership would let an attacker file grievances
// against another user); `customer` is locked to keep tickets scoped
// to the customer they were opened for.
const ALLOWED_FIELDS = ['title', 'description', 'status_id', 'category_id'];

export default async function updateSupportQueryById(supportQueryId, newData) {
    const { user } = await verifyAuth();
    if (!user?.id) return { error: 'Not authenticated' };
    if (!supportQueryId) return { error: 'Missing ticket id' };

    const caller = await db.User.findByPk(user.id, {
        attributes: ['id', 'roles', 'customer'],
        raw: true,
    });
    const roles = Array.isArray(caller?.roles) ? caller.roles : [];
    const isDaystar = roles.some((r) => DAYSTAR_ROLES.has(r?.name));

    const ticket = await db.SupportQuery.findByPk(supportQueryId, { raw: true });
    if (!ticket) return { error: 'Ticket not found' };
    // Non-Daystar callers can only edit tickets on their own customer.
    if (!isDaystar && String(ticket.customer) !== String(caller?.customer)) {
        return { error: 'Not authorised' };
    }

    const clean = {};
    for (const key of ALLOWED_FIELDS) {
        if (newData && Object.prototype.hasOwnProperty.call(newData, key)) {
            clean[key] = newData[key];
        }
    }

    const [updatedRowsCount] = await db.SupportQuery.update(clean, {
        where: { id: supportQueryId },
    });
    revalidatePath('/support');
    return { updatedRowsCount };
}
