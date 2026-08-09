'use server';
import { Op } from 'sequelize';
import db from '@/database/models';
import { verifyAuth } from '@/lib/auth/auth';

const ADMIN_ROLES = new Set(['Admin', 'Daystar Portal Admin', 'Daystar Customer Admin']);

// Everything the palette can jump to is either a static shortcut (below) or
// something we look up by name at query time. Kept small — the palette is a
// jump menu, not a full search engine.
export async function globalSearch(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return { results: [] };
    const term = `%${q}%`;

    const { user } = await verifyAuth();
    if (!user?.id) return { results: [] };
    const full = await db.User.findByPk(user.id, { raw: true });
    const roles = Array.isArray(full?.roles) ? full.roles : [];
    const isAdmin = roles.some((r) => ADMIN_ROLES.has(r?.name));

    // Fire all lookups in parallel — none of them are expensive.
    const [tickets, customers, users] = await Promise.all([
        db.SupportQuery.findAll({
            where: { title: { [Op.iLike]: term } },
            limit: 5, order: [['updated_at', 'DESC']],
            raw: true,
        }).catch(() => []),
        db.Customer.findAll({
            where: { company_name: { [Op.iLike]: term } },
            limit: 5, order: [['company_name', 'ASC']],
            raw: true,
        }).catch(() => []),
        isAdmin
            ? db.User.findAll({
                where: {
                    [Op.or]: [
                        { username: { [Op.iLike]: term } },
                        { email: { [Op.iLike]: term } },
                        { name: { [Op.iLike]: term } },
                        { surname: { [Op.iLike]: term } },
                    ],
                },
                limit: 5, order: [['username', 'ASC']],
                raw: true,
            }).catch(() => [])
            : Promise.resolve([]),
    ]);

    const results = [
        ...tickets.map((t) => ({
            id: `ticket:${t.id}`,
            type: 'ticket',
            title: t.title,
            subtitle: 'Support ticket',
            href: `/support/details/${t.id}`,
        })),
        ...customers.map((c) => ({
            id: `customer:${c.id}`,
            type: 'customer',
            title: c.company_name,
            subtitle: 'Customer',
            href: `/customers/${c.id}`,
        })),
        ...users.map((u) => ({
            id: `user:${u.id}`,
            type: 'user',
            title: [u.name, u.surname].filter(Boolean).join(' ') || u.username || u.email,
            subtitle: u.email || u.username,
            href: `/admin/identity/users`,
        })),
    ];

    return { results };
}
