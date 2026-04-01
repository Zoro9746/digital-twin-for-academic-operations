const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Petition = require('../models/Petition');

describe('DigitalTwin API integration tests', () => {
  jest.setTimeout(180000);

  let app;

  // Ensure JWT/proxy-dependent middleware uses deterministic values in tests.
  const JWT_SECRET = 'test_jwt_secret_change_me';
  const TEST_DB_NAME = 'digital_twin_test';

  const signToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });

  const mkAuth = (userId) => ({ Authorization: `Bearer ${signToken(userId)}` });

  beforeAll(async () => {
    dotenv.config();
    if (!process.env.MONGO_URI) throw new Error('Missing MONGO_URI for integration tests');

    // Run tests in an isolated DB inside the same Mongo cluster.
    const rawUri = process.env.MONGO_URI;
    const [hostPart, queryPart] = rawUri.split('?');
    const hostNoSlash = hostPart.endsWith('/') ? hostPart.slice(0, -1) : hostPart;
    process.env.MONGO_URI = queryPart
      ? `${hostNoSlash}/${TEST_DB_NAME}?${queryPart}`
      : `${hostNoSlash}/${TEST_DB_NAME}`;

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_EXPIRE = '1h';
    process.env.CLIENT_URL = 'http://localhost:5173';

    await mongoose.connect(process.env.MONGO_URI);
    app = require('../app');
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  test('student cannot access other student report (IDOR)', async () => {
    const course = await Course.create({
      name: 'Operating Systems',
      code: 'CS302',
      department: 'CSE',
      semester: 3,
      facultyId: null,
      hasLab: false,
      schedule: { day: 'Mon', time: '09:00', room: 'R1' },
    });

    const u1 = await User.create({ name: 'Stu One', email: 's1@x.com', password: 'Pass@123', role: 'student' });
    const u2 = await User.create({ name: 'Stu Two', email: 's2@x.com', password: 'Pass@123', role: 'student' });

    const s1 = await Student.create({ userId: u1._id, rollNo: 'CSE25001', department: 'CSE', semester: 3, enrolledCourses: [course._id] });
    const s2 = await Student.create({ userId: u2._id, rollNo: 'CSE25002', department: 'CSE', semester: 3, enrolledCourses: [course._id] });

    await Attendance.create({ courseId: course._id, studentId: s1._id, date: '2026-01-06', status: 'present' });
    await Attendance.create({ courseId: course._id, studentId: s2._id, date: '2026-01-06', status: 'absent' });

    const resForbidden = await request(app)
      .get(`/api/reports/student/${s2._id}`)
      .set(mkAuth(u1._id));
    expect(resForbidden.status).toBe(403);

    const resOk = await request(app)
      .get(`/api/reports/student/${s1._id}`)
      .set(mkAuth(u1._id));
    expect(resOk.status).toBe(200);
    expect(resOk.headers['content-type']).toContain('application/pdf');
  });

  test('student cannot download other student petition document (IDOR)', async () => {
    // Create upload file required by Petition controller.
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filename = 'test-petition-doc.pdf';
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, 'test');

    const course = await Course.create({
      name: 'DBMS',
      code: 'CS401',
      department: 'CSE',
      semester: 4,
      facultyId: null,
      hasLab: false,
      schedule: { day: 'Tue', time: '10:00', room: 'R1' },
    });

    const u1 = await User.create({ name: 'Stu One', email: 'p1@x.com', password: 'Pass@123', role: 'student' });
    const u2 = await User.create({ name: 'Stu Two', email: 'p2@x.com', password: 'Pass@123', role: 'student' });

    const s1 = await Student.create({ userId: u1._id, rollNo: 'CSE26001', department: 'CSE', semester: 4, enrolledCourses: [course._id] });
    await Student.create({ userId: u2._id, rollNo: 'CSE26002', department: 'CSE', semester: 4, enrolledCourses: [course._id] });

    const petition = await Petition.create({
      studentId: s1._id,
      courseId: course._id,
      type: 'medical',
      reason: 'test',
      fromDate: '2026-01-10',
      toDate: '2026-01-10',
      document: {
        filename,
        originalName: 'doc.pdf',
        mimetype: 'application/pdf',
        size: 4,
      },
    });

    const resForbidden = await request(app)
      .get(`/api/petitions/${petition._id}/document`)
      .set(mkAuth(u2._id));
    expect(resForbidden.status).toBe(403);

    const resOk = await request(app)
      .get(`/api/petitions/${petition._id}/document`)
      .set(mkAuth(u1._id));
    expect(resOk.status).toBe(200);
  });

  test('faculty authorization: attendance mark and marks upload are restricted by assigned courses', async () => {
    const course = await Course.create({
      name: 'Computer Networks',
      code: 'CS402',
      department: 'CSE',
      semester: 4,
      facultyId: null,
      hasLab: false,
      schedule: { day: 'Wed', time: '11:00', room: 'R2' },
    });

    const uStudent = await User.create({ name: 'Stu', email: 'stu@x.com', password: 'Pass@123', role: 'student' });
    const s = await Student.create({ userId: uStudent._id, rollNo: 'CSE27001', department: 'CSE', semester: 4, enrolledCourses: [course._id] });

    const uFacA = await User.create({ name: 'Fac A', email: 'fa@x.com', password: 'Pass@123', role: 'faculty' });
    const uFacB = await User.create({ name: 'Fac B', email: 'fb@x.com', password: 'Pass@123', role: 'faculty' });

    const facA = await Faculty.create({ userId: uFacA._id, department: 'CSE', assignedCourses: [course._id], designation: 'Assistant Professor' });
    const facB = await Faculty.create({ userId: uFacB._id, department: 'CSE', assignedCourses: [], designation: 'Assistant Professor' });

    // Keep Course.facultyId aligned so downstream logic can still alert the assigned faculty.
    course.facultyId = facA._id;
    await course.save();

    const date = '2026-02-01';
    const attendancePayload = {
      courseId: course._id.toString(),
      date,
      records: [{ studentId: s._id.toString(), status: 'present' }],
    };

    const resAttendForbidden = await request(app)
      .post('/api/attendance/')
      .set(mkAuth(uFacB._id))
      .send(attendancePayload);
    expect(resAttendForbidden.status).toBe(403);

    const resAttendOk = await request(app)
      .post('/api/attendance/')
      .set(mkAuth(uFacA._id))
      .send(attendancePayload);
    expect(resAttendOk.status).toBe(201);

    const marksPayload = {
      courseId: course._id.toString(),
      examType: 'internal1',
      maxScore: 50,
      records: [{ studentId: s._id.toString(), score: 45 }],
    };

    const resMarksForbidden = await request(app)
      .post('/api/marks/upload-bulk')
      .set(mkAuth(uFacB._id))
      .send(marksPayload);
    expect(resMarksForbidden.status).toBe(403);

    const resMarksOk = await request(app)
      .post('/api/marks/upload-bulk')
      .set(mkAuth(uFacA._id))
      .send(marksPayload);
    expect(resMarksOk.status).toBe(201);

    const marksCount = await Marks.countDocuments({ courseId: course._id, studentId: s._id, examType: 'internal1' });
    expect(marksCount).toBe(1);
  });

  test('petition review approved excludes attendance in date range', async () => {
    const course = await Course.create({
      name: 'SE',
      code: 'CS501',
      department: 'CSE',
      semester: 5,
      facultyId: null,
      hasLab: false,
      schedule: { day: 'Thu', time: '14:00', room: 'R3' },
    });

    const uStudent = await User.create({ name: 'Stu', email: 'stu2@x.com', password: 'Pass@123', role: 'student' });
    const s = await Student.create({ userId: uStudent._id, rollNo: 'CSE28001', department: 'CSE', semester: 5, enrolledCourses: [course._id] });

    const uFac = await User.create({ name: 'Fac', email: 'fac@x.com', password: 'Pass@123', role: 'faculty' });
    const fac = await Faculty.create({ userId: uFac._id, department: 'CSE', assignedCourses: [course._id], designation: 'Assistant Professor' });
    course.facultyId = fac._id;
    await course.save();

    await Attendance.create({ courseId: course._id, studentId: s._id, date: '2026-01-10', status: 'absent' });
    await Attendance.create({ courseId: course._id, studentId: s._id, date: '2026-01-15', status: 'absent' });

    const petition = await Petition.create({
      studentId: s._id,
      courseId: course._id,
      type: 'personal',
      reason: 'test',
      fromDate: '2026-01-10',
      toDate: '2026-01-12',
      status: 'pending',
    });

    const res = await request(app)
      .put(`/api/petitions/${petition._id}/review`)
      .set(mkAuth(uFac._id))
      .send({ status: 'approved', reviewNote: 'ok' });
    expect(res.status).toBe(200);

    const attendanceInRange = await Attendance.find({ courseId: course._id, studentId: s._id, date: '2026-01-10' });
    expect(attendanceInRange[0].excludeFromCalc).toBe(true);

    const attendanceOutsideRange = await Attendance.find({ courseId: course._id, studentId: s._id, date: '2026-01-15' });
    expect(attendanceOutsideRange[0].excludeFromCalc).toBe(false);
  });
});

