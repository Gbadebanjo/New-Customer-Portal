'use server'
import models from '@/database/models';
import { v4 as uuidv4 } from "uuid";
import xss from "xss";
import { revalidatePath } from "next/cache";

export default async function AddSupportQueryMessage({ user_id, user_customer, supportCategory, title, description }) {
  const sequelize = models.sequelize;
  let tx;

  try {
    if (!user_id || !supportCategory || !title || !description) {
      throw new Error("Missing required fields");
    }

    // find status id for 'New' if available; fallback to first status if 'New' not present
    let status = await models.SupportQueryStatus.findOne({ where: { name: 'New' } });
    if (!status) status = await models.SupportQueryStatus.findOne();
    if (!status) throw new Error("No support query status configured");
    const status_id = status.id;

    tx = await sequelize.transaction();

      const support = await models.SupportQuery.create({
      id: uuidv4(),
      title: xss(title),
      description: xss(description),
      customer: user_customer,
      category_id: supportCategory,
      status_id,
      user_id
    }, { transaction: tx });

    // create initial message linked to the created support query (use support.id)
    await models.SupportQueryMessage.create({
      id: uuidv4(),
      message: xss(description),
      support_query_id: support.id,
      user_id
    }, { transaction: tx });

    await tx.commit();

    const supportWithMessages = await models.SupportQuery.findByPk(support.id, {
      include: [
        { model: models.User, as: 'user', attributes: ['id', 'name', 'surname', 'email'] },
        { model: models.SupportQueryMessage, as: 'messages', include: [{ model: models.User, as: 'user', attributes: ['id', 'email'] }] }
      ],
      order: [[{ model: models.SupportQueryMessage, as: 'messages' }, 'created_at', 'ASC']]
    });

    const result = supportWithMessages ? supportWithMessages.toJSON() : null;

    revalidatePath('/support');

      return { supportQuery: result };
  } catch (err) {
    if (tx) await tx.rollback();
    console.error("Error adding support query:", err && err.message);
    throw err;
  }
}