import nodemailer from 'nodemailer';

/* ============================================================================
   Email service (Nodemailer)
   ----------------------------------------------------------------------------
   - If SMTP_HOST is configured, real mail is sent through that SMTP server.
   - Otherwise we fall back to a JSON transport that does NOT send anything but
     lets the app run in development; the verification link is logged to the
     console so you can still test the full flow without real credentials.
   ============================================================================ */

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (process.env.SMTP_HOST) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: String(process.env.SMTP_SECURE) === 'true', // true for 465
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }

    console.warn(
      '[email] SMTP_HOST not set — using a dev console transport. ' +
        'Emails are NOT delivered; the link is printed in the server logs.'
    );
    return nodemailer.createTransport({ jsonTransport: true });
  })();

  return transporterPromise;
}

const FROM = () => process.env.EMAIL_FROM || 'EcoMatch <no-reply@ecomatch.ai>';

/**
 * Low-level send. Also logs the action link in non-production so the flow is
 * testable without a real inbox.
 */
async function sendMail({ to, subject, html, link }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from: FROM(), to, subject, html });

  // Ethereal / preview transports expose a URL; log it when present.
  const preview = nodemailer.getTestMessageUrl?.(info);
  if (preview) console.log('[email] Preview URL:', preview);

  if (process.env.NODE_ENV !== 'production' && link) {
    console.log(`[email] "${subject}" -> ${to}\n[email] Link: ${link}`);
  }
  return info;
}

/* ============================================================================
   HTML template
   ============================================================================ */
function renderTemplate({ heading, greetingName, intro, buttonText, link, footnote }) {
  const safeName = greetingName ? `Hi ${greetingName},` : 'Hi there,';
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0"
                 style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#15803d;padding:28px 32px;">
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">EcoMatch</span>
                <span style="color:#bbf7d0;font-size:13px;display:block;margin-top:2px;">Industrial Symbiosis</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 12px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:22px;color:#0f172a;">${heading}</h1>
                <p style="margin:0 0 8px 0;font-size:15px;color:#334155;">${safeName}</p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:10px;background:#15803d;">
                      <a href="${link}" target="_blank"
                         style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                        ${buttonText}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 8px 0;font-size:13px;color:#64748b;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:0 0 24px 0;font-size:13px;word-break:break-all;">
                  <a href="${link}" style="color:#15803d;">${link}</a>
                </p>
                <p style="margin:0;font-size:13px;color:#94a3b8;">${footnote}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  You received this email because an action was requested on your EcoMatch account.
                  If this wasn't you, you can safely ignore it.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* ============================================================================
   Public utilities
   ============================================================================ */

/**
 * Send the signup email-verification link.
 * @param {{to:string, name?:string, link:string}} opts
 */
export async function sendVerificationEmail({ to, name, link }) {
  const html = renderTemplate({
    heading: 'Verify your email address',
    greetingName: name,
    intro:
      'Welcome to EcoMatch! Please confirm your email address to activate your account ' +
      'and start trading industrial waste streams. This link expires in 30 minutes.',
    buttonText: 'Verify Email',
    link,
    footnote: "If you didn't create an EcoMatch account, no action is needed.",
  });
  return sendMail({ to, subject: 'Verify your EcoMatch email', html, link });
}

/**
 * Send the email-change verification link (to the NEW address).
 * @param {{to:string, name?:string, link:string}} opts
 */
export async function sendEmailChangeVerification({ to, name, link }) {
  const html = renderTemplate({
    heading: 'Confirm your new email address',
    greetingName: name,
    intro:
      'We received a request to change the email on your EcoMatch account to this address. ' +
      'Click below to confirm the change. This link expires in 30 minutes.',
    buttonText: 'Confirm New Email',
    link,
    footnote: "If you didn't request this change, please ignore this email and your address stays the same.",
  });
  return sendMail({ to, subject: 'Confirm your new EcoMatch email', html, link });
}
