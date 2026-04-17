import VerificationCode from "@/database/models/VerificationCode";
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';

export async function createVerificationCode(userId) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const existing = await VerificationCode.findOne({ where: { user_id: userId } });
    
    if (existing) {
          await existing.update({ code, expires_at: expiresAt });
      } else {
        await VerificationCode.create({ id: uuidv4(), user_id: userId, code, expires_at: expiresAt });
    }

    return code;
}

export async function createLink(userId) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    const existing = await VerificationCode.findOne({ where: { user_id: userId } });

    if (existing) {
        await existing.update({ code: token, expires_at: expiresAt });
    }
    else {
        await VerificationCode.create({ id: uuidv4(), user_id: userId, code: token, expires_at: expiresAt });
    }

    return token;
}

export async function verifyCode(userId, inputCode) {
    const record = await VerificationCode.findOne({
      where: { user_id: userId }
    });
  
    if (!record) {
      return { success: false, message: 'Verification code not found.' };
    }
  
    if (new Date() > record.expires_at) {
      return { success: false, message: 'Code has expired.' };
    }
  
    if (record.code !== inputCode) {
      return { success: false, message: 'Incorrect verification code.' };
    }
  
    return { success: true, message: 'Code is valid.' };
  }
  
  // Clean up expired codes 
  export async function cleanupExpiredCodes() {
    const deleted = await VerificationCode.destroy({
      where: {
        expires_at: {
          [Op.lt]: new Date()
        }
      }
    });
  
    return deleted;
  }
  