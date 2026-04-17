'use strict';

const {v4: uuidv4} = require("uuid");
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('text_templates', [
      {
        id: uuidv4(),
        name: 'Account.EmailConfirmationLink',
        display_name: 'Email confirmation email',
        inline_localized: 'yes',
        content: `
          <h3>Email confirmation</h3>
          <p>Please confirm your email address by clicking the following link.\t</p>
          <div>
              <a href="{{model.link}}">Confirm my email address\t</a>
          </div>
        `
      },
      {
        id: uuidv4(),
        name: 'Account.EmailSecurityCode',
        display_name: 'Email Email security code',
        inline_localized: 'yes',
        content: `
         <h3>Security Code</h3>

        <p>Your security code is: {0}</p>
        `
      },
      {
        id: uuidv4(),
        name: 'Account.PasswordResetLink',
        display_name: '.Password reset email',
        inline_localized: 'yes',
        content: `
         <h3>Password reset\t</h3>

        <p>We received an account recovery request! If you initiated this request, click the following link to reset your password.\t</p>
        
        <div>
            <a href="{{model.link}}">Reset my password\t</a>
        </div>
        `
      },
      {
        id: uuidv4(),
        name: 'StandardEmailTemplates.Layout',
        display_name: 'Default email layout template',
        inline_localized: 'yes',
        content: `
          <!DOCTYPE html>
          <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
          <head>
              <meta charset="utf-8" />
          </head>
          <body>
              {{content}}
          </body>
          </html>
        `
      },
      {
        id: uuidv4(),
        name: 'StandardEmailTemplates.Message',
        display_name: 'Simple message template for email',
        inline_localized: 'yes',
        content: `
           {{model.message}}
        `
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('text_templates', null, {});
  }
};
