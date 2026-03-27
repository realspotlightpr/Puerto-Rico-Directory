const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BRAND_COLOR = "#0891b2";
const SITE_URL = process.env.VITE_PUBLIC_URL || "https://spotlightpuertorico.com";

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  verificationLink: string,
): Promise<void> {
  const firstName = name.split(" ")[0];
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">Welcome to Spotlight Puerto Rico 🇵🇷</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 8px;">
      Hi ${firstName},
    </p>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Your business <strong style="color:#111827;">${businessName}</strong> has been submitted and is pending review. We'll notify you as soon as it goes live.
    </p>

    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 8px;">
      We've created a free account for you so you can manage your listing. <strong>Click the button below to verify your email and access your dashboard:</strong>
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${verificationLink}" style="background:${BRAND_COLOR};color:white;padding:16px 36px;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">
        ✅ Verify My Email &amp; Access Dashboard
      </a>
    </div>

    <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0 0 24px;">
      This link expires in 24 hours. If it doesn't work, copy and paste it into your browser:<br/>
      <span style="word-break:break-all;color:${BRAND_COLOR};">${verificationLink}</span>
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#111827;margin:0 0 12px;font-size:14px;font-weight:700;">Your Login Credentials</h3>
      <table style="width:100%;font-size:14px;color:#374151;">
        <tr>
          <td style="padding:4px 0;font-weight:600;width:80px;">Email:</td>
          <td style="padding:4px 0;">${to}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;">Password:</td>
          <td style="padding:4px 0;font-family:monospace;background:#f3f4f6;padding:4px 8px;border-radius:4px;">${tempPassword}</td>
        </tr>
      </table>
      <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">
        You can change your password any time from your dashboard settings.
      </p>
    </div>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#0c4a6e;margin:0 0 12px;font-size:14px;font-weight:700;">After verifying you unlock:</h3>
      <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;margin:0;">
        <li>Full dashboard to manage your listing</li>
        <li>"Verified" and "Claimed" badges on your profile</li>
        <li>AI Business Assistant</li>
        <li>Photo uploads, offers, and analytics</li>
      </ul>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Questions? Just reply to this email — we're here to help.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:32px;">
      <p style="color:#6b7280;font-size:14px;margin:0;">
        —<br/>
        Colby<br/>
        Spotlight Puerto Rico<br/>
        <strong>Helping Local Businesses Get Seen 🇵🇷</strong>
      </p>
    </div>
  `);

  await sendEmail(to, name, `Welcome to Spotlight Puerto Rico – Verify Your Email to Get Started 🚀`, html);
}

export async function sendInquiryEmail(
  to: string,
  businessName: string,
  senderName: string,
  senderEmail: string,
  message: string,
): Promise<void> {
  const safeName = escapeHtml(senderName);
  const safeEmail = escapeHtml(senderEmail);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const safeBusinessName = escapeHtml(businessName);

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">New Customer Inquiry</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Someone sent a message to <strong>${safeBusinessName}</strong> through Spotlight Puerto Rico.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#14532d;margin:0 0 12px;font-size:15px;font-weight:700;">Message Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;width:30%;vertical-align:top;">From</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${safeName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Email</td>
          <td style="padding:8px 0;font-size:14px;"><a href="mailto:${safeEmail}" style="color:${BRAND_COLOR};">${safeEmail}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Message</td>
          <td style="padding:8px 0;color:#374151;font-size:14px;line-height:1.6;">${safeMessage}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="mailto:${safeEmail}?subject=Re: Your inquiry about ${encodeURIComponent(businessName)}" style="background:${BRAND_COLOR};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Reply to ${safeName} →
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;text-align:center;">
      This message was sent via your listing on <a href="${SITE_URL}" style="color:${BRAND_COLOR};">Spotlight Puerto Rico</a>.
    </p>
  `);

  await sendEmail(to, businessName, `New inquiry for ${businessName} — Spotlight PR`, html);
}

export async function sendWelcomeNewUserEmail(
  to: string,
  name: string,
  role: "user" | "business_owner" | "admin",
): Promise<void> {
  const loginUrl = SITE_URL;

  const roleContent: Record<typeof role, { headline: string; body: string; cta: string }> = {
    user: {
      headline: "Welcome to Spotlight Puerto Rico!",
      body: `You've been invited to join Spotlight Puerto Rico. Explore local businesses, leave reviews, and be part of the community.`,
      cta: "Browse the Directory",
    },
    business_owner: {
      headline: "You're set up as a Business Owner!",
      body: `You've been added as a Business Owner on Spotlight Puerto Rico. You can now manage your listings, respond to inquiries, and grow your local presence.`,
      cta: "Go to My Dashboard",
    },
    admin: {
      headline: "You now have Admin Access!",
      body: `You've been granted admin access to Spotlight Puerto Rico. You can manage businesses, users, reviews, and platform settings from the admin panel.`,
      cta: "Open Admin Panel",
    },
  };

  const { headline, body, cta } = roleContent[role];
  const safeName = escapeHtml(name);

  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">${headline}</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Hi ${safeName}, ${body}
    </p>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#0c4a6e;margin:0 0 10px;font-size:15px;font-weight:700;">How to log in</h3>
      <ol style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;margin:0;">
        <li>Visit <a href="${loginUrl}" style="color:${BRAND_COLOR};">${loginUrl}</a></li>
        <li>Click <strong>Log In</strong> and enter your email: <strong>${escapeHtml(to)}</strong></li>
        <li>Check your email for a magic login link and click it to access your account</li>
      </ol>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${loginUrl}" style="background:${BRAND_COLOR};color:white;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        ${cta} →
      </a>
    </div>

    <p style="color:#9ca3af;font-size:13px;text-align:center;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `);

  const subjects: Record<typeof role, string> = {
    user: "You're invited to Spotlight Puerto Rico!",
    business_owner: "Your Business Owner account is ready — Spotlight PR",
    admin: "Admin access granted — Spotlight Puerto Rico",
  };

  await sendEmail(to, name, subjects[role], html);
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

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  tempPassword: string,
): Promise<void> {
  const firstName = name.split(" ")[0];
  const loginUrl = `${SITE_URL}`;
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;">Your Password Has Been Reset</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Hi ${firstName},
    </p>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
      An administrator has reset your Spotlight Puerto Rico password. Here are your new login credentials:
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <h3 style="color:#111827;margin:0 0 12px;font-size:14px;font-weight:700;">Your Temporary Password</h3>
      <table style="width:100%;font-size:14px;color:#374151;">
        <tr>
          <td style="padding:4px 0;font-weight:600;width:100px;">Email:</td>
          <td style="padding:4px 0;">${escapeHtml(to)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-weight:600;">Password:</td>
          <td style="padding:4px 0;font-family:monospace;background:#f3f4f6;padding:4px 8px;border-radius:4px;letter-spacing:0.5px;font-size:13px;">${escapeHtml(tempPassword)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${loginUrl}" style="background:${BRAND_COLOR};color:white;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
        Sign In With New Password
      </a>
    </div>

    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="color:#92400e;font-size:13px;font-weight:600;margin:0 0 6px;">⚠️ Important: Change Your Password</p>
      <p style="color:#b45309;font-size:13px;line-height:1.5;margin:0;">
        When you log in, you'll be asked to create a new password. This temporary password will work for your first login only. For security, please set a strong password that only you know.
      </p>
    </div>

    <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 8px;">
      If you didn't request this password reset or have questions, contact your administrator.
    </p>

    <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:32px;">
      <p style="color:#6b7280;font-size:14px;margin:0;">
        —<br/>
        Spotlight Puerto Rico Team<br/>
        <strong>Admin Password Reset</strong>
      </p>
    </div>
  `);

  await sendEmail(to, name, "Your Password Has Been Reset — Spotlight Puerto Rico", html);
}
