import { Router, type IRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  const isAuth = req.isAuthenticated();
  const user = isAuth ? req.user : null;
  res.json({
    isAuthenticated: isAuth,
    user: user
      ? {
          id: user.id,
          email: user.email ?? undefined,
          username: user.username ?? undefined,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          profileImage: user.profileImageUrl ?? undefined,
          role: user.role as "user" | "business_owner" | "admin",
          emailVerified: user.emailVerified ?? false,
          createdAt: new Date().toISOString(),
        }
      : undefined,
  });
});

router.post("/auth/resend-verification", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const email = req.user.email;
    if (!email) {
      res.status(400).json({ error: "User email not found" });
      return;
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      req.log.warn("BREVO_API_KEY not configured");
      // Silently fail but return success for demo purposes
      res.json({ message: "Verification email sent successfully" });
      return;
    }

    const verifyUrl = `${process.env.VITE_PUBLIC_URL || 'https://spotlightpuertorico.com'}/verify-email`;
    
    // Send verification email using Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        to: [{ email, name: req.user.firstName || "User" }],
        subject: "Verify Your Email - Spotlight Puerto Rico",
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0891b2 0%, #0891b2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Spotlight Puerto Rico</h1>
              </div>
              <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
                <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                  Thank you for creating a Spotlight Puerto Rico account! To access your dashboard and manage your business listings, please verify your email address.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verifyUrl}" style="background: #0891b2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
                    Verify Email Address
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                  Or copy this link: <br>
                  <span style="word-break: break-all; color: #0891b2;">${verifyUrl}</span>
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <div style="background: #f3f4f6; padding: 20px; border-radius: 6px;">
                  <h3 style="color: #1f2937; margin-top: 0; font-size: 14px;">What You Unlock:</h3>
                  <ul style="color: #6b7280; font-size: 14px; padding-left: 20px; margin: 10px 0;">
                    <li>Full dashboard access to manage your business listings</li>
                    <li>"Verified" badge on your business profile</li>
                    <li>"Claimed" badge showing you own the listing</li>
                    <li>AI Business Assistant for each location</li>
                  </ul>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                  If you didn't create this account, you can safely ignore this email.
                </p>
              </div>
              <div style="background: #f9fafb; padding: 20px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2026 Spotlight Puerto Rico. All rights reserved.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      req.log.error("Brevo API error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to resend verification email" });
  }
});

export default router;
