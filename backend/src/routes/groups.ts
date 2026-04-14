import { Router } from "express";
import { authenticateToken, requireVerifiedEmail } from "../middleware/auth";
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
  transferOwnership,
  getGroupDetails,
  removeGroupMember,
  updateMemberRole,
  getUserGroups,
} from "../controllers/groupController";

const router = Router();

router.post("/", authenticateToken, requireVerifiedEmail, createGroup);
router.post(
  "/:groupId/add-member",
  authenticateToken,
  requireVerifiedEmail,
  addMember,
);
router.get("/", authenticateToken, getGroups);
router.get("/:groupId/resources", authenticateToken, getGroupResources);
router.get("/:groupId/members", authenticateToken, getGroupMembers);
router.post(
  "/:groupId/invite",
  authenticateToken,
  requireVerifiedEmail,
  inviteToGroup,
);
router.delete(
  "/:groupId/members/:userId",
  authenticateToken,
  requireVerifiedEmail,
  removeMember,
);
router.put("/:groupId", authenticateToken, requireVerifiedEmail, updateGroup);
router.delete(
  "/:groupId",
  authenticateToken,
  requireVerifiedEmail,
  deleteGroup,
);
router.put(
  "/:groupId/transfer-ownership",
  authenticateToken,
  requireVerifiedEmail,
  transferOwnership,
);
router.get("/:groupId/details", authenticateToken, getGroupDetails);
router.delete(
  "/:groupId/remove-member",
  authenticateToken,
  requireVerifiedEmail,
  removeGroupMember,
);
router.put(
  "/:groupId/members/:userId/role",
  authenticateToken,
  requireVerifiedEmail,
  updateMemberRole,
);

export default router;
