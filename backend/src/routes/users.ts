import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getUserGroups } from "../controllers/groupController";

const router = Router();

router.get("/:userId/groups", authenticateToken, getUserGroups);

export default router;
