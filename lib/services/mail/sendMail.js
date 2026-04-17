import * as dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';
import getTextTemplateByName from '@/lib/controllers/textTemplates/getTextTemplateByName';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const MailTypes = {
  VERIFICATION_CODE: 'VERIFICATION_CODE',
  WELCOME: 'WELCOME',
  PASSWORD_RESET: 'PASSWORD_RESET',
  INVITATION: 'INVITATION',
};

// Maps MailType → DB template name
const TEMPLATE_NAME_MAP = {
  [MailTypes.VERIFICATION_CODE]: 'Account.EmailSecurityCode',
  [MailTypes.PASSWORD_RESET]: 'Account.PasswordResetLink',
  [MailTypes.WELCOME]: 'Account.EmailConfirmationLink',
  [MailTypes.INVITATION]: 'Account.InvitationLink',
};

// Replaces {placeholder} tokens in a template string with values from a data object
function applyPlaceholders(html, data = {}) {
  return html.replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined ? data[key] : `{${key}}`
  );
}

export const sendMail = async ({ to, subject, html, text }) => {
  const msg = { to, from: process.env.FROM_EMAIL, subject, text, html };
  try {
    await sgMail.send(msg);
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const sendEmailByType = async (type, to, data = {}) => {
  const subjects = {
    [MailTypes.VERIFICATION_CODE]: 'Your Verification Code',
    [MailTypes.PASSWORD_RESET]: 'Password Reset Request',
    [MailTypes.WELCOME]: 'Welcome to Daystar Power',
    [MailTypes.INVITATION]: 'You\'ve been invited to Daystar Power Customer Portal',
  };

  const subject = subjects[type];
  if (!subject) throw new Error('Invalid mail type');

  // Try loading template from DB
  let html = null;
  const templateName = TEMPLATE_NAME_MAP[type];
  if (templateName) {
    try {
      const { textTemplate } = await getTextTemplateByName(templateName);
      if (textTemplate?.content) {
        html = applyPlaceholders(textTemplate.content, data);
      }
    } catch {
      // Fall through to hardcoded fallback
    }
  }

  // Fallback to hardcoded styled templates if DB had nothing
  if (!html) {
    html = FALLBACK_HTML[type]?.(data);
  }

  return sendMail({ to, subject, html, text: subject });
};

// Used only if DB template is missing or empty
const FALLBACK_HTML = {
  [MailTypes.VERIFICATION_CODE]: (data) => `
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
              ${data.code}
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
  `,
  [MailTypes.PASSWORD_RESET]: (data) => `
    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
        <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">Reset Your Password</h2>
        </div>
        <div style="padding: 32px; color: #333;">
          <p style="font-size: 16px;">Hi there,</p>
          <p style="font-size: 16px;">Click the button below to reset your password. This link will expire in 10 minutes.</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.link}" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
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
  `,
  [MailTypes.INVITATION]: (data) => `
    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
        <div style="background-color: #0a1128; color: #ffffff; padding: 24px 32px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">You've Been Invited</h2>
        </div>
        <div style="padding: 32px; color: #333;">
          <p style="font-size: 16px;">Hi there,</p>
          <p style="font-size: 16px;">You've been invited to join the <strong>Daystar Power Customer Portal</strong>. Click the button below to set up your password and activate your account.</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.link}" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
              Set Up My Account
            </a>
          </div>
          <p style="font-size: 14px; color: #555;">This link will expire in 10 minutes. If you were not expecting this invitation, you can safely ignore this email.</p>
          <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
        </div>
        <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
          <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
        </div>
      </div>
    </div>
  `,
  [MailTypes.WELCOME]: (data) => `
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
            <a href="${data.baseUrl}/login" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
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
  `,
};
