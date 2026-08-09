import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';
import getTextTemplateByName from '@/lib/controllers/textTemplates/getTextTemplateByName';

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const MailTypes = {
  VERIFICATION_CODE: 'VERIFICATION_CODE',
  WELCOME: 'WELCOME',
  PASSWORD_RESET: 'PASSWORD_RESET',
  INVITATION: 'INVITATION',
  REPORT_READY: 'REPORT_READY',
};

// Maps MailType → DB template name
const TEMPLATE_NAME_MAP = {
  [MailTypes.VERIFICATION_CODE]: 'Account.EmailSecurityCode',
  [MailTypes.PASSWORD_RESET]: 'Account.PasswordResetLink',
  [MailTypes.WELCOME]: 'Account.EmailConfirmationLink',
  [MailTypes.INVITATION]: 'Account.InvitationLink',
  [MailTypes.REPORT_READY]: 'Reports.NewReportReady',
};

// Replaces {placeholder} tokens in a template string with values from a data object
function applyPlaceholders(html, data = {}) {
  return html.replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined ? data[key] : `{${key}}`
  );
}

export const sendMail = async ({ to, subject, html, text }) => {
  const msg = {
    to,
    from: process.env.FROM_EMAIL,
    subject,
    text,
    html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false },
    },
  };
  // Attach the branded logo inline. Any HTML that references
  // `cid:daystar-logo` will resolve to this image with no external fetch.
  // Only add when the message actually references the CID — some plain
  // messages don't need the ~4KB overhead.
  if (LOGO_ATTACHMENT && typeof html === 'string' && html.includes(`cid:${LOGO_CID}`)) {
    msg.attachments = [LOGO_ATTACHMENT];
  }
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('SendGrid error:', error?.response?.body ?? error.message);
  }
};

export const sendEmailByType = async (type, to, data = {}) => {
  const subjects = {
    [MailTypes.VERIFICATION_CODE]: 'Your Verification Code',
    [MailTypes.PASSWORD_RESET]: 'Password Reset Request',
    [MailTypes.WELCOME]: 'Welcome to Daystar Power',
    [MailTypes.INVITATION]: 'You\'ve been invited to Daystar Power Customer Portal',
    [MailTypes.REPORT_READY]: 'You have a new report available',
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

// Read the branded header logo once at module load. We attach it as an
// inline part on every outgoing message and reference it via `cid:` in
// the HTML. This is the only reliably cross-client approach — Gmail,
// Outlook.com, and Yahoo strip both external <img src="http…"> (asks
// user to "show images") AND src="data:…" URIs. SendGrid inline
// attachments show up as native email images with no user gate.
const LOGO_CID = 'daystar-logo';
const LOGO_ATTACHMENT = (() => {
    try {
        // Same joint Shell + Daystar mark used on the report PDF header —
        // consistent branding across every customer-facing surface.
        const p = path.join(process.cwd(), 'public', 'img', 'daystar', 'shell-daystar.png');
        const bytes = fs.readFileSync(p);
        return {
            content: bytes.toString('base64'),
            filename: 'shell-daystar.png',
            type: 'image/png',
            disposition: 'inline',
            content_id: LOGO_CID,
        };
    } catch (err) {
        console.warn('Could not read email logo:', err?.message);
        return null;
    }
})();

// Shared branded header — logo + subtitle — used at the top of every
// template. Kept inline (no <style>) since Gmail strips <style> from
// most inbox rendering.
function headerBlock(title) {
  const logoImg = LOGO_ATTACHMENT
    ? `<img src="cid:${LOGO_CID}" alt="Daystar Power" style="max-width: 160px; height: auto; margin: 0 auto 12px; display: block;" />`
    : '';
  return `
        <div style="background-color: #0a1128; color: #ffffff; padding: 28px 32px 22px; text-align: center;">
          ${logoImg}
          <h2 style="margin: 0; font-size: 20px; font-weight: 500; letter-spacing: 0.3px;">${title}</h2>
        </div>`;
}

// Used only if DB template is missing or empty
const FALLBACK_HTML = {
  [MailTypes.VERIFICATION_CODE]: (data) => `
    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
        ${headerBlock('Email Verification')}
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
        ${headerBlock('Reset Your Password')}
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
        ${headerBlock("You've Been Invited")}
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
        ${headerBlock('Your Account is Ready')}
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
  [MailTypes.REPORT_READY]: (data) => `
    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f4f7; padding: 40px 20px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
        ${headerBlock('Your report is ready')}
        <div style="padding: 32px; color: #333;">
          <p style="font-size: 16px;">Hi ${data.name || 'there'},</p>
          <p style="font-size: 16px;">A new report has been published for ${data.siteName ? `<strong>${data.siteName}</strong>` : 'your site'}${data.periodLabel ? ` (${data.periodLabel})` : ''}.</p>
          <p style="font-size: 16px;">You can sign in to the portal to view the full report at any time.</p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${data.link || '#'}" style="background-color: #0a1128; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; display: inline-block;">
              View Report
            </a>
          </div>
          <p style="font-size: 16px; margin-top: 40px;">Thanks,<br><strong>Daystar Power Team</strong></p>
        </div>
        <div style="background-color: #f1f1f1; text-align: center; font-size: 12px; color: #777; padding: 16px;">
          <p style="margin: 0;">Need help? Contact us at <a href="mailto:idt-servicedesk@daystar-power.com" style="color: #0a1128;">idt-servicedesk@daystar-power.com</a></p>
        </div>
      </div>
    </div>
  `,
};
