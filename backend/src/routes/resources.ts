import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken } from "../middleware/auth";
import {
  getResources,
  getPendingRequestsCount,
  createResource,
  updateResource,
  deleteResource,
  getResourceGroups,
  addResourceToGroup,
  removeResourceFromGroup,
  shareResource,
} from "../controllers/resourceController";

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get("/", authenticateToken, getResources);
router.get(
  "/:id/pending-requests-count",
  authenticateToken,
  getPendingRequestsCount,
);
router.post("/", authenticateToken, writeLimiter, createResource);
router.put("/:id", authenticateToken, updateResource);
router.delete("/:id", authenticateToken, deleteResource);

// Resource sharing
router.get("/:resourceId/groups", authenticateToken, getResourceGroups);
router.post(
  "/:resourceId/groups/:groupId",
  authenticateToken,
  addResourceToGroup,
);
router.delete(
  "/:resourceId/groups/:groupId",
  authenticateToken,
  removeResourceFromGroup,
);
router.post("/:resourceId/share", authenticateToken, shareResource);

export default router;
