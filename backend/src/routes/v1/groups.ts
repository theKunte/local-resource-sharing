import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireVerifiedEmail } from "../../middleware/auth";
import {
  createGroup,
  addMember,
  getGroups,
  getGroupResources,
  getGroupMembers,
  inviteToGroup,
  removeMember,
  updateGroup,
  deleteGroup,
  updateMemberRole,
} from "../../controllers/groupController";

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  createGroup,
);
router.post(
  "/:groupId/add-member",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  addMember,
);
router.get("/", authenticateToken, getGroups);
router.get("/:groupId/resources", authenticateToken, getGroupResources);
router.get("/:groupId/members", authenticateToken, getGroupMembers);
router.post(
  "/:groupId/invite",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  inviteToGroup,
);
router.delete(
  "/:groupId/members/:userId",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  removeMember,
);
router.put(
  "/:groupId",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  updateGroup,
);
router.delete(
  "/:groupId",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  deleteGroup,
);
router.put(
  "/:groupId/members/:userId/role",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  updateMemberRole,
);

export default router;
