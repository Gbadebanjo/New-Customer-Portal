'use strict';

const VERIFICATION_CODE_HTML = `
<div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
    <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px; text-align: center;">
      <h2 style="margin: 0; font-size: 24px;">Email Verification</h2>
    </div>
    <div style="padding: 32px; color: #333;">
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px;">To complete your verification, please use the code below:</p>
      <div style="margin: 24px 0; text-align: center;">
        <span style="display: inline-block; font-size: 32px; font-weight: bold; background-color: #eef2ff; color: #0a1128; padding: 12px 24px; border-radius: 8px; letter-spacing: 4px;">
          {code}
        </span>
      </div>
      <p style="font-size: 14px; color: #555;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
    </div>
    <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
      <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
    </div>
  </div>
</div>
`.trim();

const PASSWORD_RESET_HTML = `
<div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
    <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px; text-align: center;">
      <h2 style="margin: 0; font-size: 24px;">Reset Your Password</h2>
    </div>
    <div style="padding: 32px; color: #333;">
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px;">Click the button below to reset your password. This link will expire in 10 minutes.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="{link}" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="font-size: 14px; color: #555;">If you did not request this, you can safely ignore this email.</p>
      <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
    </div>
    <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
      <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
    </div>
  </div>
</div>
`.trim();

const WELCOME_HTML = `
<div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
    <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px; text-align: center;">
      <h2 style="margin: 0; font-size: 24px;">Your Account is Ready</h2>
    </div>
    <div style="padding: 32px; color: #333;">
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px;">Welcome to the <strong>Daystar Power Customer Portal</strong>! Your account has been successfully set up and your email address is now confirmed.</p>
      <p style="font-size: 16px;">You can now log in to view your energy data, reports, and manage your account.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="{baseUrl}/login" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
          Go to Portal
        </a>
      </div>
      <p style="font-size: 14px; color: #555;">If you did not set up this account, please contact us immediately.</p>
      <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
    </div>
    <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
      <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
    </div>
  </div>
</div>
`.trim();

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const updates = [
      {
        name: 'Account.EmailSecurityCode',
        display_name: 'Email Security Code',
        content: VERIFICATION_CODE_HTML,
      },
      {
        name: 'Account.PasswordResetLink',
        display_name: 'Password Reset Email',
        content: PASSWORD_RESET_HTML,
      },
      {
        name: 'Account.EmailConfirmationLink',
        display_name: 'Email Confirmation',
        content: WELCOME_HTML,
      },
    ];

    for (const tpl of updates) {
      await queryInterface.bulkUpdate(
        'text_templates',
        { display_name: tpl.display_name, content: tpl.content, updated_at: now },
        { name: tpl.name }
      );
    }
  },

  down: async () => {
    // Reverting HTML content is not practical — no-op
  },
};
