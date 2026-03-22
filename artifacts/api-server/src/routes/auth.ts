import { Router, type IRouter, type Request, type Response } from "express";

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
          createdAt: new Date().toISOString(),
        }
      : undefined,
  });
});

export default router;
