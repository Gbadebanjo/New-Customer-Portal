'use server'
import models from '@/database/models';

export async function getSupportQueryById(supportQueryId) {
    try {
        const supportQuery = await models.SupportQuery.findByPk(supportQueryId, {
            include: [
                { model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] },
                { model: models.SupportQueryMessage, as: 'messages', include: [{ model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }] }
            ],
            order: [[{ model: models.SupportQueryMessage, as: 'messages' }, 'created_at', 'ASC']]
        });

        const result = supportQuery ? supportQuery.toJSON() : null;
        return { supportQuery: result };
    } catch (error) {
        throw error;
    }
}
