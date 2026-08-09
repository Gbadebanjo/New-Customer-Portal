'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

async function currentUserId() {
    const { user } = await verifyAuth();
    return user?.id ?? null;
}

/**
 * Return the caller's recent unread notifications, plus a total unread count.
 * The bell polls this every 90s alongside getNotificationsSummary.
 */
export async function listMyNotifications({ limit = 10 } = {}) {
    const userId = await currentUserId();
    if (!userId) return { unread: 0, items: [] };

    const [unread, items] = await Promise.all([
        db.Notification.count({ where: { user_id: userId, read_at: null } }),
        db.Notification.findAll({
            where: { user_id: userId },
            order: [['created_at', 'DESC']],
            limit,
            raw: true,
        }),
    ]);
    return { unread, items };
}

export async function markNotificationRead(id) {
    const userId = await currentUserId();
    if (!userId || !id) return { ok: false };
    const [n] = await db.Notification.update(
        { read_at: new Date() },
        { where: { id, user_id: userId, read_at: null } }
    );
    return { ok: true, updated: n };
}

export async function markAllNotificationsRead() {
    const userId = await currentUserId();
    if (!userId) return { ok: false };
    const [n] = await db.Notification.update(
        { read_at: new Date() },
        { where: { user_id: userId, read_at: null } }
    );
    return { ok: true, updated: n };
}
