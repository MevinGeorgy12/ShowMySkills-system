import express from 'express';
import {
  listInternships,
  internshipDetails,
  createNewInternship,
  updateExistingInternship,
  removeInternship,
} from '../controllers/internshipController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateInternshipPayload } from '../validators/internshipValidator.js';

const router = express.Router();

/**
 * @openapi
 * /api/internships:
 *   get:
 *     summary: Discover and filter active internship openings
 *     description: Retrieve a paginated list of internships with search keyword, location, mode (remote/onsite/hybrid), department, track, required skill, and verified badges.
 *     tags:
 *       - Internships
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by role title, company name, department, track, or description
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (e.g. Bengaluru, Remote)
 *       - in: query
 *         name: mode
 *         schema:
 *           type: string
 *           enum: [remote, onsite, hybrid]
 *         description: Work modality filter
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department (predefined or custom)
 *       - in: query
 *         name: track
 *         schema:
 *           type: string
 *         description: Filter by track (predefined or custom)
 *       - in: query
 *         name: skill
 *         schema:
 *           type: string
 *         description: Filter by required technical skill (e.g. React, Python)
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter for recruiter-verified listings only
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Paginated internship openings retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Internship'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *   post:
 *     summary: Create a new internship posting (Recruiters & Companies)
 *     description: Publish a new internship opportunity to the candidate discovery feed with support for predefined and custom Department and Track.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Internships
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - company
 *               - location
 *             properties:
 *               role:
 *                 type: string
 *                 example: 'Frontend Engineering Intern'
 *               company:
 *                 type: string
 *                 example: 'TechNova Labs'
 *               location:
 *                 type: string
 *                 example: 'Hyderabad, India'
 *               mode:
 *                 type: string
 *                 enum: [remote, onsite, hybrid]
 *                 default: 'remote'
 *                 example: 'remote'
 *               department:
 *                 type: string
 *                 example: 'Engineering'
 *               track:
 *                 type: string
 *                 example: 'Development'
 *               stipend:
 *                 type: string
 *                 example: '₹20,000 / month'
 *               duration:
 *                 type: string
 *                 example: '3 Months'
 *               description:
 *                 type: string
 *                 example: 'Build responsive web apps with React, Tailwind CSS, and Next.js.'
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['React', 'TypeScript', 'Tailwind']
 *     responses:
 *       201:
 *         description: Internship posting created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Internship posting created successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Internship'
 *       400:
 *         description: Validation error or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Valid JWT Bearer token required
 */
router.get('/', listInternships);
router.post('/', authMiddleware, validateInternshipPayload, createNewInternship);

/**
 * @openapi
 * /api/internships/{id}:
 *   get:
 *     summary: Get detailed information for an internship opening
 *     description: Retrieve complete details for a single internship opening by its unique ID.
 *     tags:
 *       - Internships
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the internship
 *         example: '67bb8e7d206f4a38b9c1d010'
 *     responses:
 *       200:
 *         description: Internship details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Internship'
 *       404:
 *         description: Internship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update an existing internship posting
 *     description: Update details, skills, department, track, status, or stipend for an existing internship posting.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Internships
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the internship
 *         example: '67bb8e7d206f4a38b9c1d010'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               company:
 *                 type: string
 *               location:
 *                 type: string
 *               mode:
 *                 type: string
 *                 enum: [remote, onsite, hybrid]
 *               department:
 *                 type: string
 *               track:
 *                 type: string
 *               stipend:
 *                 type: string
 *               duration:
 *                 type: string
 *               description:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, paused, closed]
 *     responses:
 *       200:
 *         description: Internship posting updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Internship posting updated successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Internship'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Internship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Remove an internship posting
 *     description: Delete an internship posting from the platform.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Internships
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the internship
 *         example: '67bb8e7d206f4a38b9c1d010'
 *     responses:
 *       200:
 *         description: Internship posting deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Internship posting removed successfully'
 *       404:
 *         description: Internship not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', internshipDetails);
router.put('/:id', authMiddleware, validateInternshipPayload, updateExistingInternship);
router.delete('/:id', authMiddleware, removeInternship);

export default router;
