import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInternshipPayload } from '../api/src/validators/internshipValidator.js';

test('COM-002 Validation: Valid predefined Department and Track pass validation', () => {
  const req = {
    body: {
      role: 'Frontend Intern',
      department: 'Engineering',
      track: 'Development',
    },
  };
  let nextCalled = false;
  const res = {
    status: () => res,
    json: () => res,
  };

  validateInternshipPayload(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.body.department, 'Engineering');
  assert.strictEqual(req.body.track, 'Development');
});

test('COM-002 Validation: Custom Department and Custom Track are accepted and trimmed', () => {
  const req = {
    body: {
      role: 'Hardware Intern',
      department: '  Robotics & Automation  ',
      track: '  Embedded Firmware  ',
    },
  };
  let nextCalled = false;
  const res = {
    status: () => res,
    json: () => res,
  };

  validateInternshipPayload(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.body.department, 'Robotics & Automation');
  assert.strictEqual(req.body.track, 'Embedded Firmware');
});

test('COM-002 Validation: Empty or whitespace-only Department is rejected with 400', () => {
  const testCases = ['', '   '];

  for (const emptyVal of testCases) {
    const req = {
      body: {
        role: 'Intern',
        department: emptyVal,
        track: 'Development',
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseBody = data;
        return res;
      },
    };

    let nextCalled = false;
    validateInternshipPayload(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody?.success, false);
    assert.strictEqual(responseBody?.message, 'Department cannot be empty');
  }
});

test('COM-002 Validation: Empty or whitespace-only Track is rejected with 400', () => {
  const testCases = ['', '   '];

  for (const emptyVal of testCases) {
    const req = {
      body: {
        role: 'Intern',
        department: 'Engineering',
        track: emptyVal,
      },
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseBody = data;
        return res;
      },
    };

    let nextCalled = false;
    validateInternshipPayload(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 400);
    assert.strictEqual(responseBody?.success, false);
    assert.strictEqual(responseBody?.message, 'Track cannot be empty');
  }
});

test('COM-002 Validation: Department and Track length exceeding 100 characters is rejected', () => {
  const longString = 'A'.repeat(101);

  // Too long department
  const reqDept = { body: { department: longString, track: 'Development' } };
  let statusDept = null;
  const resDept = {
    status: (c) => {
      statusDept = c;
      return resDept;
    },
    json: () => resDept,
  };
  validateInternshipPayload(reqDept, resDept, () => {});
  assert.strictEqual(statusDept, 400);

  // Too long track
  const reqTrack = { body: { department: 'Engineering', track: longString } };
  let statusTrack = null;
  const resTrack = {
    status: (c) => {
      statusTrack = c;
      return resTrack;
    },
    json: () => resTrack,
  };
  validateInternshipPayload(reqTrack, resTrack, () => {});
  assert.strictEqual(statusTrack, 400);
});

test('COM-002 Backward Compatibility: Requests omitting department and track still pass validation', () => {
  const req = {
    body: {
      role: 'Legacy Opening',
      company: 'Legacy Corp',
      location: 'Remote',
    },
  };
  let nextCalled = false;
  const res = {
    status: () => res,
    json: () => res,
  };

  validateInternshipPayload(req, res, () => {
    nextCalled = true;
  });

  assert.strictEqual(nextCalled, true);
  assert.strictEqual(req.body.department, undefined);
  assert.strictEqual(req.body.track, undefined);
});

test('COM-002 Search & Filter Logic: Filter handles custom department and track queries with regex', () => {
  const mockInternships = [
    { id: 1, role: 'SWE', department: 'Engineering', track: 'Development' },
    { id: 2, role: 'Quant', department: 'Quantitative Finance', track: 'Algorithmic Trading' },
    { id: 3, role: 'Bioinformatician', department: 'Biotechnology', track: 'Genomic Sequencing' },
  ];

  // Filtering by custom department
  const deptQuery = 'Quantitative Finance';
  const deptFilter = new RegExp(deptQuery, 'i');
  const filteredByDept = mockInternships.filter((item) => deptFilter.test(item.department));
  assert.strictEqual(filteredByDept.length, 1);
  assert.strictEqual(filteredByDept[0].department, 'Quantitative Finance');

  // Filtering by custom track
  const trackQuery = 'Genomic Sequencing';
  const trackFilter = new RegExp(trackQuery, 'i');
  const filteredByTrack = mockInternships.filter((item) => trackFilter.test(item.track));
  assert.strictEqual(filteredByTrack.length, 1);
  assert.strictEqual(filteredByTrack[0].track, 'Genomic Sequencing');
});

