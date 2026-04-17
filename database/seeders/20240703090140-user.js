'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function hashUserPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hashedPassword = crypto.scryptSync(password, salt, 64);
  return hashedPassword.toString('hex') + ':' + salt;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = await bcrypt.genSalt(10);

    // Define roles directly as array of objects
    const roles = [{ name: 'Admin', isAssigned: true }];
    const roles2 = [{ name: 'Customer', isAssigned: true }];
    const password1 = 'password123@2024';
    const password2 = 'daystarDev@2024';
    const hashedPassword1 = hashUserPassword(password1);
    const hashedPassword2 = hashUserPassword(password2);

    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        username: 'john_doe',
        email: 'john.doe@example.com',
        phone_number: '1234567890',
        name: 'John',
        surname: 'Doe',
        password: hashedPassword1,
        ammp_api_key: null,
        customer: null,
        roles: Sequelize.literal(`ARRAY[${roles.map(role => `'${JSON.stringify(role)}'`).join(', ')}]::jsonb[]`),
        timezone: 'UTC',
        is_locked_out: false,
        not_active: false,
        email_confirmed: true,
        is_external: false,
        creation_time: new Date(),
        modification_time: new Date(),
      },
      {
        id: uuidv4(),
        username: 'admin',
        email: 'idt-servicedesk@daystar-power.com',
        phone_number: '0987654321',
        name: 'Daystar',
        surname: 'Dev',
        password: hashedPassword2,
        ammp_api_key: null,
        customer: null,
        roles: Sequelize.literal(`ARRAY[${roles2.map(role => `'${JSON.stringify(role)}'`).join(', ')}]::jsonb[]`),
        timezone: 'UTC',
        is_locked_out: false,
        not_active: false,
        email_confirmed: true,
        is_external: false,
        creation_time: new Date(),
        modification_time: new Date(),
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
