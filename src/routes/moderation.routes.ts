import { Router } from "express";
import { ModerationController } from "../controllers/moderation.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireAdmin } from "../middleware/admin-auth.middleware";
import { asyncHandler } from "../utils/asyncHandler.utils";

const router = Router();

// Apply authentication and admin role requirement to all moderation routes
router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/moderation/queue:
 *   get:
 *     summary: Get paginated flag queue
 *     tags: [Admin, Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: offset
 *         in: query
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Moderation queue items
 *       403:
 *         description: Admin role required
 */
router.get("/queue", asyncHandler(ModerationController.getQueue));

/**
 * @swagger
 * /admin/moderation/{id}/approve:
 *   post:
 *     summary: Approve content
 *     tags: [Admin, Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Content approved
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Flag not found
 */
router.post("/:id/approve", asyncHandler(ModerationController.approveContent));

/**
 * @swagger
 * /admin/moderation/{id}/reject:
 *   post:
 *     summary: Reject and hide content
 *     tags: [Admin, Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Content rejected and hidden
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Flag not found
 */
router.post("/:id/reject", asyncHandler(ModerationController.rejectContent));

/**
 * @swagger
 * /admin/moderation/{id}/escalate:
 *   post:
 *     summary: Escalate to senior admin
 *     tags: [Admin, Moderation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Flag escalated to senior admin
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Flag not found
 */
router.post("/:id/escalate", asyncHandler(ModerationController.escalateFlag));

/**
 * @swagger
 * /admin/moderation/stats:
 *   get:
 *     summary: Get moderation statistics
 *     tags: [Admin, Moderation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Moderation statistics
 *       403:
 *         description: Admin role required
 */
router.get("/stats", asyncHandler(ModerationController.getStats));

export default router;
