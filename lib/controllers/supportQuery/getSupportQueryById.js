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
        console.log('getSupportQueryById - result:', result);

        return { supportQuery: result };
    } catch (error) {
        // console.error('Error fetching support query:', error && error.message);
        throw error;
    }
}


// 'use server'
// import models from '@/database/models';

// export async function getSupportQueryById(supportQueryId) {
//    try {
//         const supportQuery = await models.SupportQuery.findByPk(supportQueryId, {
//       include: [
//         { model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] },
//         { model: models.SupportQueryMessage, as: 'messages', include: [{ model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] }] }
//       ],
//       order: [[{ model: models.SupportQueryMessage, as: 'messages' }, 'created_at', 'ASC']]
//     });

//         const raw = supportQuery ? supportQuery.toJSON() : null;
//         console.log('getSupportQueryById - raw:', raw); 

//         // print full nested object for debugging
//         if (raw) console.log(JSON.stringify(raw, null, 2)); // or: console.dir(raw, { depth: null })

//         if (!raw) return { supportQuery: null };

//         // return a predictable plain shape: query fields, query user, and messages with embedded user details
//         const { messages = [], user: queryUser, ...queryFields } = raw;

//         const formattedMessages = (messages || []).map(m => ({
//           id: m.id,
//           message: m.message,
//           created_at: m.created_at,
//           updated_at: m.updated_at,
//           user: m.user ? {
//             id: m.user.id,
//             name: m.user.name,
//             surname: m.user.surname,
//             email: m.user.email
//           } : null
//         }));

//         const result = {
//           ...queryFields,
//           user: queryUser ? {
//             id: queryUser.id,
//             name: queryUser.name,
//             surname: queryUser.surname,
//             email: queryUser.email
//           } : null,
//           messages: formattedMessages
//         };

//         return { supportQuery: result };
//     } catch (error) {
//         throw error;
//     }
// }