import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { requestReturn, confirmReturn } from "../controllers/loanController";

const router = Router();

router.post("/:id/request-return", authenticateToken, requestReturn);
router.post("/:id/confirm-return", authenticateToken, confirmReturn);

export default router;
