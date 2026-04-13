import { Router, type IRouter } from "express";
import healthRouter from "./health";
import casesRouter from "./cases";
import sessionsRouter from "./sessions";
import metricsRouter from "./metrics";
import examsRouter from "./exams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(casesRouter);
router.use(sessionsRouter);
router.use(metricsRouter);
router.use(examsRouter);

export default router;
