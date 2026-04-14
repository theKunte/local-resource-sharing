import { Router } from "express";
import { authenticateToken, requireVerifiedEmail } from "../middleware/auth";
import { requestReturn, confirmReturn } from "../controllers/loanController";

const router = Router();

router.post(
  "/:id/request-return",
  authenticateToken,
  requireVerifiedEmail,
  requestReturn,
);
router.post(
  "/:id/confirm-return",
  authenticateToken,
  requireVerifiedEmail,
  confirmReturn,
);

export default router;
