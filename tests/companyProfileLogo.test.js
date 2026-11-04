import test from 'node:test';
import assert from 'node:assert/strict';
import User from '../api/src/models/User.js';
import { uploadCompanyLogo } from '../api/src/services/uploadService.js';
import { uploadController } from '../api/src/controllers/uploadController.js';
import { userService } from '../api/src/services/userService.js';
import { uploadService as webUploadService } from '../web/src/services/apiClient.js';

// Client-side logo validation logic mirroring CompanyProfilePage
const validateLogoFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, WebP, and SVG images are allowed.',
    };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 5MB limit.' };
  }
  return { valid: true, error: null };
};

// Header rendering helper mirroring CompanyProfilePage logo box
const getHeaderLogoElement = (company) => {
  if (company && company.logo) {
    return {
      type: 'image',
      src: company.logo,
      alt: `${company.name || 'Company'} logo`,
    };
  }
  return {
    type: 'placeholder',
    badge: 'Partner',
    icon: 'Building2',
  };
};

// ──── 1. Allowed image file types and size limits ────

test('Logo Upload Limits: Multer limit is configured to 5MB', () => {
  assert.ok(uploadCompanyLogo.limits, 'Multer limits must be defined');
  assert.strictEqual(
    uploadCompanyLogo.limits.fileSize,
    5 * 1024 * 1024,
    'File size limit must be exactly 5MB'
  );
});

test('Logo Upload Filter: Accepts JPEG, PNG, WebP, and SVG images', () => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

  for (const mimetype of allowed) {
    let cbCalled = false;
    let accepted = null;
    let error = null;

    uploadCompanyLogo.fileFilter(
      {},
      { mimetype },
      (err, result) => {
        cbCalled = true;
        error = err;
        accepted = result;
      }
    );

    assert.ok(cbCalled, `Callback must be called for ${mimetype}`);
    assert.strictEqual(error, null, `No error should occur for ${mimetype}`);
    assert.strictEqual(accepted, true, `${mimetype} must be accepted`);
  }
});

test('Logo Upload Filter: Rejects disallowed file types', () => {
  const disallowed = ['image/gif', 'application/pdf', 'text/plain', 'video/mp4'];

  for (const mimetype of disallowed) {
    let cbCalled = false;
    let error = null;

    uploadCompanyLogo.fileFilter(
      {},
      { mimetype },
      (err, result) => {
        cbCalled = true;
        error = err;
      }
    );

    assert.ok(cbCalled, `Callback must be called for ${mimetype}`);
    assert.ok(error instanceof Error, `Error must be passed for ${mimetype}`);
    assert.match(error.message, /Only JPEG, PNG, WebP, and SVG images are allowed/);
  }
});

test('Client-side Logo Validation: Validates type and size limits properly', () => {
  // Valid PNG under 5MB
  const validPng = { type: 'image/png', size: 2 * 1024 * 1024 };
  assert.deepStrictEqual(validateLogoFile(validPng), { valid: true, error: null });

  // Valid SVG
  const validSvg = { type: 'image/svg+xml', size: 50 * 1024 };
  assert.deepStrictEqual(validateLogoFile(validSvg), { valid: true, error: null });

  // Exceeds 5MB
  const tooLarge = { type: 'image/jpeg', size: 6 * 1024 * 1024 };
  const largeRes = validateLogoFile(tooLarge);
  assert.strictEqual(largeRes.valid, false);
  assert.match(largeRes.error, /exceeds 5MB limit/);

  // Invalid mimetype
  const invalidType = { type: 'image/gif', size: 100 * 1024 };
  const typeRes = validateLogoFile(invalidType);
  assert.strictEqual(typeRes.valid, false);
  assert.match(typeRes.error, /Only JPEG, PNG, WebP, and SVG/);
});

// ──── 2. Uploading a logo and saving it to the profile ────

test('Schema: User model defines companyProfile.logo path', () => {
  const path = User.schema.paths['companyProfile.logo'];
  assert.ok(path, 'User schema must define companyProfile.logo');
  assert.strictEqual(path.instance, 'String');
});

test('Upload Service Client: webUploadService exports uploadCompanyLogo', () => {
  assert.strictEqual(typeof webUploadService.uploadCompanyLogo, 'function');
});

test('Logo Upload Controller: rejects requests with no file', async () => {
  let statusCode = null;
  let jsonResponse = null;

  const req = { file: null };
  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      jsonResponse = data;
      return res;
    },
  };

  await uploadController.handleLogoUpload(req, res, () => {});
  assert.strictEqual(statusCode, 400);
  assert.strictEqual(jsonResponse.success, false);
  assert.match(jsonResponse.message, /No logo image uploaded/);
});

test('Logo Upload Controller: saves logo to User and returns formatted URL', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let updatedUserId = null;
  let updatePayload = null;

  User.findByIdAndUpdate = async (id, update) => {
    updatedUserId = id;
    updatePayload = update;
    return { _id: id };
  };

  try {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      file: {
        filename: 'acme-logo-12345.png',
        size: 10240,
        mimetype: 'image/png',
      },
      user: { id: '64f1a2b3c4d5e6f7a8b9c111', role: 'company' },
    };
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        jsonResponse = data;
        return res;
      },
    };

    await uploadController.handleLogoUpload(req, res, () => {});

    assert.strictEqual(statusCode, 201);
    assert.strictEqual(jsonResponse.success, true);
    assert.match(jsonResponse.data.url, /\/uploads\/company-logos\/acme-logo-12345\.png/);
    assert.strictEqual(updatedUserId, '64f1a2b3c4d5e6f7a8b9c111');
    assert.match(updatePayload.$set['companyProfile.logo'], /\/uploads\/company-logos\/acme-logo-12345\.png/);
    assert.match(updatePayload.$set.profileIcon, /\/uploads\/company-logos\/acme-logo-12345\.png/);
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test('User Service: updateProfile persists logo and profileIcon', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let updatedPayload = null;

  User.findByIdAndUpdate = (id, update) => {
    updatedPayload = update;
    return {
      select: () =>
        Promise.resolve({
          _id: id,
          companyProfile: {
            logo: update.$set['companyProfile.logo'],
          },
          profileIcon: update.$set.profileIcon,
        }),
    };
  };

  try {
    const res = await userService.updateProfile('64f1a2b3c4d5e6f7a8b9c111', {
      logo: 'https://example.com/uploads/company-logos/test-logo.png',
    });

    assert.strictEqual(
      updatedPayload.$set['companyProfile.logo'],
      'https://example.com/uploads/company-logos/test-logo.png'
    );
    assert.strictEqual(
      updatedPayload.$set.profileIcon,
      'https://example.com/uploads/company-logos/test-logo.png'
    );
    assert.strictEqual(
      res.companyProfile.logo,
      'https://example.com/uploads/company-logos/test-logo.png'
    );
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

// ──── 3. Replacing an existing logo ────

test('Replacing Logo: updateProfile replaces old logo and preserves other profile fields', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let capturedUpdate = null;

  User.findByIdAndUpdate = (id, update) => {
    capturedUpdate = update;
    return {
      select: () =>
        Promise.resolve({
          _id: id,
          companyProfile: {
            companyName: 'Acme Corp',
            tagline: 'Building the Future',
            logo: update.$set['companyProfile.logo'],
          },
        }),
    };
  };

  try {
    const newLogoUrl = 'https://example.com/uploads/company-logos/new-brand-logo.png';
    const result = await userService.updateProfile('64f1a2b3c4d5e6f7a8b9c111', {
      companyProfile: {
        companyName: 'Acme Corp',
        tagline: 'Building the Future',
      },
      logo: newLogoUrl,
    });

    assert.strictEqual(capturedUpdate.$set['companyProfile.logo'], newLogoUrl);
    assert.strictEqual(capturedUpdate.$set['companyProfile.companyName'], 'Acme Corp');
    assert.strictEqual(capturedUpdate.$set['companyProfile.tagline'], 'Building the Future');
    assert.strictEqual(capturedUpdate.$set.profileIcon, newLogoUrl);
    assert.strictEqual(result.companyProfile.logo, newLogoUrl);
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

// ──── 4. Removing a logo and restoring the default placeholder ────

test('Removing Logo: updateProfile with empty logo clears companyProfile.logo and profileIcon', async () => {
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;
  let capturedUpdate = null;

  User.findByIdAndUpdate = (id, update) => {
    capturedUpdate = update;
    return {
      select: () =>
        Promise.resolve({
          _id: id,
          companyProfile: {
            logo: '',
          },
          profileIcon: '',
        }),
    };
  };

  try {
    const result = await userService.updateProfile('64f1a2b3c4d5e6f7a8b9c111', {
      logo: '',
    });

    assert.strictEqual(capturedUpdate.$set['companyProfile.logo'], '');
    assert.strictEqual(capturedUpdate.$set.profileIcon, '');
    assert.strictEqual(result.companyProfile.logo, '');

    // Check that removing logo restores default placeholder in header
    const headerElement = getHeaderLogoElement({ name: 'Acme Corp', logo: result.companyProfile.logo });
    assert.strictEqual(headerElement.type, 'placeholder');
    assert.strictEqual(headerElement.icon, 'Building2');
    assert.strictEqual(headerElement.badge, 'Partner');
  } finally {
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

// ──── 5. Displaying the logo in the company profile header ────

test('Header Logo Display: renders image when logo is present', () => {
  const companyWithLogo = {
    name: 'Acme Technologies',
    logo: 'https://example.com/uploads/company-logos/acme.png',
  };

  const headerElement = getHeaderLogoElement(companyWithLogo);
  assert.strictEqual(headerElement.type, 'image');
  assert.strictEqual(headerElement.src, 'https://example.com/uploads/company-logos/acme.png');
  assert.strictEqual(headerElement.alt, 'Acme Technologies logo');
});

test('Header Logo Display: renders default placeholder when logo is missing or empty', () => {
  const companyWithoutLogo = {
    name: 'No Logo Corp',
    logo: '',
  };

  const headerElement = getHeaderLogoElement(companyWithoutLogo);
  assert.strictEqual(headerElement.type, 'placeholder');
  assert.strictEqual(headerElement.badge, 'Partner');
  assert.strictEqual(headerElement.icon, 'Building2');

  const companyNullLogo = {
    name: 'Null Corp',
    logo: null,
  };
  const nullHeader = getHeaderLogoElement(companyNullLogo);
  assert.strictEqual(nullHeader.type, 'placeholder');
});
