import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireVerifiedEmail } from "../../middleware/auth";
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
  searchResources,
  getRecommendations,
} from "../../controllers/resourceController";

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Search and recommendations (must come before / to avoid route conflicts)
router.get("/search", authenticateToken, searchResources);
router.get("/recommendations", authenticateToken, getRecommendations);

router.get("/", authenticateToken, getResources);
router.get(
  "/:id/pending-requests-count",
  authenticateToken,
  getPendingRequestsCount,
);
router.post(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  createResource,
);
router.put(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  updateResource,
);
router.delete(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  deleteResource,
);

// Resource groups management
router.get("/:resourceId/groups", authenticateToken, getResourceGroups);
router.post(
  "/:resourceId/groups/:groupId",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  addResourceToGroup,
);
router.delete(
  "/:resourceId/groups/:groupId",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  removeResourceFromGroup,
);
router.post(
  "/:resourceId/share",
  authenticateToken,
  requireVerifiedEmail,
  writeLimiter,
  shareResource,
);

export default router;
