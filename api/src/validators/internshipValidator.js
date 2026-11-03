/**
 * Internship validation middleware
 *
 * Validates:
 * - Department & Track (COM-002)
 * - Work Mode & Location (Required for Onsite/Hybrid, disabled/cleared for Remote)
 * - Duration (Required, positive number with clear unit, rejects 0 or negative)
 * - Required Skills (Mandatory, at least one skill)
 * - Compensation (Paid: requires min/max with max > min, Unpaid: saves no amount, Flexible: optional range with same rules)
 */

export const validateInternshipPayload = (req, res, next) => {
  const { department, track, mode, location, duration, skills, compensationType, stipendMin, stipendMax } = req.body;

  // 1. Department validation
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

  // 2. Track validation
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

  // 3. Work Mode & Location validation
  if (mode !== undefined && mode !== null) {
    const normalizedMode = String(mode).trim().toLowerCase();

    if (['onsite', 'hybrid'].includes(normalizedMode)) {
      if (location === undefined || location === null || typeof location !== 'string' || !location.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Location is required for Onsite and Hybrid work modes',
        });
      }
      req.body.location = location.trim();
    } else if (normalizedMode === 'remote') {
      if (location !== undefined && location !== null && typeof location === 'string' && location.trim() !== '' && location.trim().toLowerCase() !== 'remote') {
        return res.status(400).json({
          success: false,
          message: 'Location must not be provided for Remote work mode',
        });
      }
      req.body.location = '';
    }
    req.body.mode = normalizedMode;
  }

  // 4. Duration validation
  if (duration !== undefined && duration !== null) {
    if (typeof duration !== 'string' || !duration.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Duration cannot be empty',
      });
    }

    const trimmedDuration = duration.trim();
    // Check if starts with a number (e.g., '10 weeks', '4 months', '0 weeks', '-2 months')
    const numMatch = trimmedDuration.match(/^(-?\d+)/);
    if (numMatch) {
      const parsedVal = parseInt(numMatch[1], 10);
      if (parsedVal <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be greater than zero',
        });
      }
    }

    req.body.duration = trimmedDuration;
  }

  // 5. Required Skills validation
  if (skills !== undefined && skills !== null) {
    let skillsList = [];
    if (Array.isArray(skills)) {
      skillsList = skills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof skills === 'string') {
      skillsList = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (skillsList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one required skill must be provided',
      });
    }
    req.body.skills = skillsList;
  }

  // 6. Compensation validation
  if (
    compensationType !== undefined ||
    stipendMin !== undefined ||
    stipendMax !== undefined
  ) {
    const compType = String(compensationType || 'paid').toLowerCase();

    if (compType === 'paid') {
      const min = stipendMin !== undefined && stipendMin !== null && stipendMin !== '' ? Number(stipendMin) : NaN;
      const max = stipendMax !== undefined && stipendMax !== null && stipendMax !== '' ? Number(stipendMax) : NaN;

      if (Number.isNaN(min) || Number.isNaN(max)) {
        return res.status(400).json({
          success: false,
          message: 'Minimum and maximum monthly stipend amounts are required for Paid internships',
        });
      }

      if (min < 0 || max < 0) {
        return res.status(400).json({
          success: false,
          message: 'Stipend amounts cannot be negative',
        });
      }

      if (max <= min) {
        return res.status(400).json({
          success: false,
          message: 'Maximum stipend must be greater than minimum stipend',
        });
      }

      req.body.compensationType = 'paid';
      req.body.stipendMin = min;
      req.body.stipendMax = max;
      const formatted = `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')} / month`;
      req.body.stipendText = formatted;
      req.body.stipend = formatted;
    } else if (compType === 'unpaid') {
      req.body.compensationType = 'unpaid';
      req.body.stipendMin = 0;
      req.body.stipendMax = 0;
      req.body.stipendText = 'Unpaid';
      req.body.stipend = 'Unpaid';
    } else if (compType === 'flexible') {
      req.body.compensationType = 'flexible';
      const hasMin = stipendMin !== undefined && stipendMin !== null && stipendMin !== '';
      const hasMax = stipendMax !== undefined && stipendMax !== null && stipendMax !== '';

      if (hasMin || hasMax) {
        const min = Number(stipendMin);
        const max = Number(stipendMax);

        if (Number.isNaN(min) || Number.isNaN(max)) {
          return res.status(400).json({
            success: false,
            message: 'Both minimum and maximum stipend amounts must be specified if entered',
          });
        }

        if (min < 0 || max < 0) {
          return res.status(400).json({
            success: false,
            message: 'Stipend amounts cannot be negative',
          });
        }

        if (max <= min) {
          return res.status(400).json({
            success: false,
            message: 'Maximum stipend must be greater than minimum stipend',
          });
        }

        req.body.stipendMin = min;
        req.body.stipendMax = max;
        const formatted = `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')} / month (Flexible)`;
        req.body.stipendText = formatted;
        req.body.stipend = formatted;
      } else {
        req.body.stipendMin = 0;
        req.body.stipendMax = 0;
        req.body.stipendText = 'Flexible';
        req.body.stipend = 'Flexible';
      }
    }
  }

  next();
};
