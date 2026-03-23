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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: "Supabase not configured" });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resend verification email using Supabase Admin API
    const { error } = await supabase.auth.admin.sendRawEmail({
      to: email,
      html: `
        <h1>Verify Your Email</h1>
        <p>Click the link below to verify your email address:</p>
        <p>
          <a href="${process.env.PUBLIC_URL || 'http://localhost:3000'}/verify-email">
            Verify Email
          </a>
        </p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
    });

    if (error) throw error;
    
    res.json({ message: "Verification email sent successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to resend verification email" });
  }
});

export default router;
