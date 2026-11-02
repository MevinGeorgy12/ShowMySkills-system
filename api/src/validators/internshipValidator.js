/**
 * Internship validation middleware (COM-002)
 *
 * Enforces sensible validation for custom Department and Track options:
 * - Rejects empty or whitespace-only Department and Track values when provided.
 * - Trims unnecessary whitespace before persisting.
 * - Enforces max length limits (up to 100 characters).
 * - Maintains backwards compatibility for legacy requests without Department or Track.
 */

export const validateInternshipPayload = (req, res, next) => {
  const { department, track } = req.body;

  if (department !== undefined && department !== null) {
    if (typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department cannot be empty',
      });
    }
    if (department.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Department cannot exceed 100 characters',
      });
    }
    req.body.department = department.trim();
  }

  if (track !== undefined && track !== null) {
    if (typeof track !== 'string' || !track.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Track cannot be empty',
      });
    }
    if (track.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Track cannot exceed 100 characters',
      });
    }
    req.body.track = track.trim();
  }

  next();
};

