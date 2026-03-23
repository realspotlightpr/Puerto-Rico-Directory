const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BRAND_COLOR = "#0891b2";
const SITE_URL = process.env.VITE_PUBLIC_URL || "https://spotlightpuertorico.com";

function emailWrapper(content: string): string {
  return `
    <html>
      <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
              <tr><td style="background:${BRAND_COLOR};padding:32px 32px 24px;border-radius:12px 12px 0 0;text-align:center;">
                <img src="${SITE_URL}/logo.png" alt="Spotlight Puerto Rico" style="height:48px;max-width:200px;object-fit:contain;" />
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px;letter-spacing:0.5px;">SPOTLIGHT PUERTO RICO</p>
              </td></tr>
              <tr><td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
                ${content}
              </td></tr>
              <tr><td style="background:#f9fafb;padding:20px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;text-align:center;">
                <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Spotlight Puerto Rico. All rights reserved.</p>
                <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">
                  <a href="${SITE_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${SITE_URL}</a>
                </p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
  `;
}

async function sendEmail(to: string, toName: string, subject: string, htmlContent: string): Promise<void> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.warn("[email] BREVO_API_KEY not configured — skipping email send");
    return;
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: "Spotlight Puerto Rico", email: "noreply@spotlightpuertorico.com" },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Brevo API error: ${JSON.stringify(err)}`);
  }
}

export async function sendWelcomeAndBusinessSubmissionEmail(
  to: string,
  name: string,
  businessName: string,
  tempPassword: string,
): Promise<void> {
  const loginUrl = `${SITE_URL}`;
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">Your Business Was Submitted! 🎉</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Hi ${name}, thanks for adding <strong>${businessName}</strong> to Spotlight Puerto Rico. 
      Your listing is now <strong>pending review</strong> — our team will approve it shortly.
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#0c4a6e;margin:0 0 12px;font-size:15px;font-weight:700;">🔐 Your New Account Credentials</h3>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;">
        We created a Spotlight Puerto Rico account for you so you can manage your listing.
      </p>
      <table style="width:100%;background:#ffffff;border:1px solid #e0f2fe;border-radius:8px;padding:0;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #e0f2fe;color:#6b7280;font-size:13px;width:40%;">Email</td>
          <td style="padding:10px 16px;border-bottom:1px solid #e0f2fe;color:#111827;font-size:14px;font-weight:600;">${to}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;color:#6b7280;font-size:13px;">Temporary Password</td>
          <td style="padding:10px 16px;color:#111827;font-size:14px;font-weight:700;letter-spacing:1px;font-family:monospace;">${tempPassword}</td>
        </tr>
      </table>
    </div>

    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#92400e;font-size:14px;margin:0;">
        ⚠️ <strong>Important:</strong> Please log in and change your password as soon as possible. 
        You will also need to verify your email address.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}" style="background:${BRAND_COLOR};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Log In to Your Dashboard →
      </a>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;">
      <h4 style="color:#374151;font-size:14px;margin:0 0 12px;">Next Steps:</h4>
      <ol style="color:#6b7280;font-size:14px;line-height:1.8;padding-left:20px;margin:0;">
        <li>Log in at <a href="${loginUrl}" style="color:${BRAND_COLOR};">spotlightpuertorico.com</a> using the credentials above</li>
        <li>Change your temporary password in your account settings</li>
        <li>Verify your email address (check for a separate verification email)</li>
        <li>Once approved, your business will appear in the public directory</li>
      </ol>
    </div>
  `);

  await sendEmail(to, name, `Your Business "${businessName}" Has Been Submitted — Spotlight PR`, html);
}

export async function sendInquiryEmail(
  to: string,
  businessName: string,
  senderName: string,
  senderEmail: string,
  message: string,
): Promise<void> {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">New Customer Inquiry</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Someone sent a message to <strong>${businessName}</strong> through Spotlight Puerto Rico.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#14532d;margin:0 0 12px;font-size:15px;font-weight:700;">Message Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;width:30%;vertical-align:top;">From</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${senderName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Email</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${senderEmail}" style="color:${BRAND_COLOR};">${senderEmail}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Message</td>
          <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.6;">${message.replace(/\n/g, "<br>")}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="mailto:${senderEmail}?subject=Re: Your inquiry about ${encodeURIComponent(businessName)}" style="background:${BRAND_COLOR};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Reply to ${senderName} →
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;text-align:center;">
      This message was sent via your listing on <a href="${SITE_URL}" style="color:${BRAND_COLOR};">Spotlight Puerto Rico</a>.
    </p>
  `);

  await sendEmail(to, businessName, `New inquiry for ${businessName} — Spotlight PR`, html);
}

export async function sendVerificationEmail(
  to: string,
  name: string,
): Promise<void> {
  const verifyUrl = `${SITE_URL}/verify-email`;
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">Verify Your Email Address</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Hi ${name}, please verify your email to unlock full access to your Spotlight Puerto Rico dashboard.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="background:${BRAND_COLOR};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Verify Email Address
      </a>
    </div>
    <p style="color:#9ca3af;font-size:13px;text-align:center;">
      Or copy this link: <a href="${verifyUrl}" style="color:${BRAND_COLOR};">${verifyUrl}</a>
    </p>
  `);

  await sendEmail(to, name, "Verify Your Email — Spotlight Puerto Rico", html);
}
