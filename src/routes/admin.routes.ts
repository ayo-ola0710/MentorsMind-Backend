import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin-auth.middleware';
import { asyncHandler } from '../utils/asyncHandler.utils';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get platform statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AdminStats'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/stats', asyncHandler(AdminController.getStats));

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users with optional filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50, maximum: 100 }
 *       - name: role
 *         in: query
 *         schema: { type: string, enum: [mentor, mentee, admin] }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         users:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/User'
 *                         meta:
 *                           $ref: '#/components/schemas/PaginationMeta'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users', asyncHandler(AdminController.listUsers));

/**
 * @swagger
 * /admin/users/{id}/status:
 *   put:
 *     summary: Activate or deactivate a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/schemas/UUIDParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserStatusRequest'
 *           example:
 *             isActive: false
 *     responses:
 *       200:
 *         description: User status updated
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/users/:id/status', asyncHandler(AdminController.updateUserStatus));

/**
 * @swagger
 * /admin/transactions:
 *   get:
 *     summary: List all platform transactions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/transactions', asyncHandler(AdminController.listTransactions));

/**
 * @swagger
 * /admin/disputes:
 *   get:
 *     summary: List all disputes
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of disputes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/disputes', asyncHandler(AdminController.listDisputes));

/**
 * @swagger
 * /admin/disputes/{id}/resolve:
 *   post:
 *     summary: Resolve or dismiss a dispute
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/schemas/UUIDParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResolveDisputeRequest'
 *           example:
 *             status: resolved
 *             notes: Refund issued to mentee after review
 *     responses:
 *       200:
 *         description: Dispute resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Dispute not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/disputes/:id/resolve',
  asyncHandler(AdminController.resolveDispute),
);

/**
 * @swagger
 * /admin/system-health:
 *   get:
 *     summary: Get system health status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         database: { type: string, enum: [healthy, degraded, down] }
 *                         stellar: { type: string, enum: [healthy, degraded, down] }
 *                         redis: { type: string, enum: [healthy, degraded, down] }
 *                         uptime: { type: number }
 */
router.get('/system-health', asyncHandler(AdminController.getSystemHealth));

/**
 * @swagger
 * /admin/logs:
 *   get:
 *     summary: Query audit logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 50 }
 *       - name: action
 *         in: query
 *         schema: { type: string }
 *         description: Filter by audit action type
 *       - name: userId
 *         in: query
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/logs', asyncHandler(AdminController.getLogs));

/**
 * @swagger
 * /admin/config:
 *   post:
 *     summary: Update a system configuration value
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateConfigRequest'
 *           example:
 *             key: platform.feePercentage
 *             value: 10
 *     responses:
 *       200:
 *         description: Configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/config', asyncHandler(AdminController.updateConfig));

export default router;
