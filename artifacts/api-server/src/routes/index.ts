import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import categoriesRouter from "./categories";
import businessesRouter from "./businesses";
import reviewsRouter from "./reviews";
import myRouter from "./my";
import adminRouter from "./admin";
import usersRouter from "./users";
import openaiRouter from "./openai/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(businessesRouter);
router.use(reviewsRouter);
router.use(myRouter);
router.use(adminRouter);
router.use(usersRouter);
router.use(openaiRouter);

export default router;
