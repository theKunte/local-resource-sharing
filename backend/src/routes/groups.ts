import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
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

router.post("/", authenticateToken, createGroup);
router.post("/:groupId/add-member", authenticateToken, addMember);
router.get("/", authenticateToken, getGroups);
router.get("/:groupId/resources", authenticateToken, getGroupResources);
router.get("/:groupId/members", authenticateToken, getGroupMembers);
router.post("/:groupId/invite", authenticateToken, inviteToGroup);
router.delete("/:groupId/members/:userId", authenticateToken, removeMember);
router.put("/:groupId", authenticateToken, updateGroup);
router.delete("/:groupId", authenticateToken, deleteGroup);
router.put(
  "/:groupId/transfer-ownership",
  authenticateToken,
  transferOwnership,
);
router.get("/:groupId/details", authenticateToken, getGroupDetails);
router.delete("/:groupId/remove-member", authenticateToken, removeGroupMember);
router.put(
  "/:groupId/members/:userId/role",
  authenticateToken,
  updateMemberRole,
);

export default router;
