/**
 * Internship validation middleware (COM-002, COM-003)
 *
 * Enforces sensible validation for custom Department and Track options:
 * - Rejects empty or whitespace-only Department and Track values when provided.
 * - Trims unnecessary whitespace before persisting.
 * - Enforces max length limits (up to 100 characters).
 * - Requires a location for onsite and hybrid internships and clears it for remote roles.
 * - Maintains backwards compatibility for legacy requests without Department or Track.
 */

export const validateInternshipPayload = (req, res, next) => {
  const { department, track } = req.body;

  if (req.body.mode !== undefined && req.body.mode !== null) {
    if (typeof req.body.mode !== 'string' || !['remote', 'onsite', 'hybrid'].includes(req.body.mode.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Work modality must be remote, onsite, or hybrid' });
    }
    req.body.mode = req.body.mode.toLowerCase();

    if (req.body.mode === 'remote') {
      req.body.location = '';
    } else {
      if (typeof req.body.location !== 'string' || !req.body.location.trim()) {
        return res.status(400).json({
          success: false,
          message: `Location is required for ${req.body.mode} internships`,
        });
      }
      if (req.body.location.trim().length > 150) {
        return res.status(400).json({ success: false, message: 'Location cannot exceed 150 characters' });
      }
      req.body.location = req.body.location.trim();
    }
  }

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

