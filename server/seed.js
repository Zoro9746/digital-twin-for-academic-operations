/**
 * FULL COLLEGE SEED v4
 * Exact realistic relationship mapping: Courses -> Faculty -> Students -> Timetable -> Marks -> Attendance
 */
require('dotenv').config();
const mongoose = require('mongoose');

const User       = require('./models/User');
const Student    = require('./models/Student');
const Faculty    = require('./models/Faculty');
const Course     = require('./models/Course');
const Attendance = require('./models/Attendance');
const Marks      = require('./models/Marks');
const Timetable  = require('./models/Timetable');

const FIRST_MALE = ['Aarav','Aditya','Akash','Arjun','Aryan','Ashwin','Deepak','Dhruv','Ganesh','Govind','Harsh','Ishan','Karan','Kartik','Kishore','Krishna','Lokesh','Manoj','Mihir','Mohan','Nakul','Naveen','Nikhil','Nitin','Om','Pranav','Pratik','Preetham','Rahul','Rajan','Rajesh','Rakesh','Ramesh','Rohit','Ravi','Sachin','Sanjay','Shiva','Shreyas','Siddharth','Suresh','Suraj','Tarun','Uday','Varun','Vijay','Vikas','Vinay','Vivek','Yash'];
const FIRST_FEMALE = ['Aishwarya','Akanksha','Amrita','Ananya','Anjali','Aparna','Archana','Bhavana','Deepika','Divya','Gayatri','Hema','Ishita','Jyothi','Kavya','Keerthi','Lakshmi','Lavanya','Madhuri','Manasa','Meghana','Nandini','Neha','Nikitha','Padma','Pooja','Preethi','Priya','Rachana','Ramya','Ranjitha','Rekha','Sahithi','Sandhya','Shruthi','Sindhu','Sneha','Sowmya','Sravani','Sridevi','Sushma','Swathi','Tanvi','Usha','Varsha','Vasudha','Vidya','Vijayalakshmi','Yamini','Yashaswini'];
const LAST = ['Kumar','Sharma','Reddy','Pillai','Nair','Rao','Singh','Gupta','Mehta','Patel','Iyer','Agarwal','Joshi','Verma','Mishra','Naidu','Shetty','Gowda','Hegde','Bhat','Kulkarni','Patil','Desai','Chandra','Pandey','Tiwari','Shah','Saxena','Chatterjee','Mukherjee','Das','Banerjee','Bose','Sen','Ghosh','Roy','Rajan','Menon','Krishnan','Subramaniam'];
const DESIGNATIONS = ['Professor','Associate Professor','Assistant Professor','Senior Lecturer','Lecturer'];

const PREFIXES = {cse:'CSE',ece:'ECE',mech:'MCH',civil:'CVL'};
const DEPTS = Object.keys(PREFIXES).map(k => k.toUpperCase());
const SEMESTERS = [1, 2, 3, 4];
const ALL_FIRST = [...FIRST_MALE,...FIRST_FEMALE];

function getName(idx) {
  return `${ALL_FIRST[idx % ALL_FIRST.length]} ${LAST[Math.floor(idx/ALL_FIRST.length) % LAST.length]}`;
}

const DEPT_COURSES = {
  CSE: [
    {name:'Engineering Mathematics I',code:'CS101',semester:1}, {name:'Engineering Physics',code:'CS102',semester:1}, {name:'Basics of Electrical Engineering',code:'CS103',semester:1}, {name:'Introduction to Programming',code:'CS104',semester:1}, {name:'Engineering Graphics',code:'CS105',semester:1},
    {name:'Engineering Mathematics II',code:'CS201',semester:2}, {name:'Engineering Chemistry',code:'CS202',semester:2}, {name:'Digital Electronics',code:'CS203',semester:2}, {name:'Data Structures',code:'CS204',semester:2}, {name:'Object Oriented Programming',code:'CS205',semester:2},
    {name:'Discrete Mathematics',code:'CS301',semester:3}, {name:'Computer Organization and Architecture',code:'CS302',semester:3}, {name:'Database Management Systems',code:'CS303',semester:3}, {name:'Design and Analysis of Algorithms',code:'CS304',semester:3}, {name:'Software Engineering',code:'CS305',semester:3},
    {name:'Operating Systems',code:'CS401',semester:4}, {name:'Computer Networks',code:'CS402',semester:4}, {name:'Theory of Computation',code:'CS403',semester:4}, {name:'Web Technologies',code:'CS404',semester:4}, {name:'Microprocessors and Microcontrollers',code:'CS405',semester:4}
  ],
  ECE: [
    {name:'Engineering Mathematics I',code:'EC101',semester:1}, {name:'Engineering Physics',code:'EC102',semester:1}, {name:'Basic Electronics',code:'EC103',semester:1}, {name:'C Programming',code:'EC104',semester:1}, {name:'Engineering Mechanics',code:'EC105',semester:1},
    {name:'Engineering Mathematics II',code:'EC201',semester:2}, {name:'Engineering Chemistry',code:'EC202',semester:2}, {name:'Electronic Devices and Circuits',code:'EC203',semester:2}, {name:'Network Analysis',code:'EC204',semester:2}, {name:'Signals and Systems',code:'EC205',semester:2},
    {name:'Analog Circuits',code:'EC301',semester:3}, {name:'Digital System Design',code:'EC302',semester:3}, {name:'Electromagnetic Waves',code:'EC303',semester:3}, {name:'Control Systems',code:'EC304',semester:3}, {name:'Digital Signal Processing',code:'EC305',semester:3},
    {name:'Analog Communication',code:'EC401',semester:4}, {name:'Linear Integrated Circuits',code:'EC402',semester:4}, {name:'Microprocessors',code:'EC403',semester:4}, {name:'VLSI Design',code:'EC404',semester:4}, {name:'Antenna and Wave Propagation',code:'EC405',semester:4}
  ],
  MECH: [
    {name:'Engineering Mathematics I',code:'ME101',semester:1}, {name:'Engineering Physics',code:'ME102',semester:1}, {name:'Basic Mechanical Engineering',code:'ME103',semester:1}, {name:'Engineering Graphics',code:'ME104',semester:1}, {name:'Environmental Science',code:'ME105',semester:1},
    {name:'Engineering Mathematics II',code:'ME201',semester:2}, {name:'Engineering Materials',code:'ME202',semester:2}, {name:'Engineering Mechanics',code:'ME203',semester:2}, {name:'Thermodynamics',code:'ME204',semester:2}, {name:'Manufacturing Processes',code:'ME205',semester:2},
    {name:'Fluid Mechanics',code:'ME301',semester:3}, {name:'Kinematics of Machinery',code:'ME302',semester:3}, {name:'Strength of Materials',code:'ME303',semester:3}, {name:'Machine Drawing',code:'ME304',semester:3}, {name:'Applied Thermodynamics',code:'ME305',semester:3},
    {name:'Dynamics of Machinery',code:'ME401',semester:4}, {name:'Heat and Mass Transfer',code:'ME402',semester:4}, {name:'Design of Machine Elements',code:'ME403',semester:4}, {name:'Fluid Machinery',code:'ME404',semester:4}, {name:'Metrology and Measurements',code:'ME405',semester:4}
  ],
  CIVIL: [
    {name:'Engineering Mathematics I',code:'CV101',semester:1}, {name:'Engineering Physics',code:'CV102',semester:1}, {name:'Basic Civil Engineering',code:'CV103',semester:1}, {name:'Engineering Mechanics',code:'CV104',semester:1}, {name:'Building Materials',code:'CV105',semester:1},
    {name:'Engineering Mathematics II',code:'CV201',semester:2}, {name:'Engineering Chemistry',code:'CV202',semester:2}, {name:'Surveying',code:'CV203',semester:2}, {name:'Solid Mechanics',code:'CV204',semester:2}, {name:'Fluid Mechanics',code:'CV205',semester:2},
    {name:'Structural Analysis I',code:'CV301',semester:3}, {name:'Concrete Technology',code:'CV302',semester:3}, {name:'Geotechnical Engineering',code:'CV303',semester:3}, {name:'Water Supply Engineering',code:'CV304',semester:3}, {name:'Highway Engineering',code:'CV305',semester:3},
    {name:'Structural Analysis II',code:'CV401',semester:4}, {name:'Design of RC Structures',code:'CV402',semester:4}, {name:'Foundation Engineering',code:'CV403',semester:4}, {name:'Waste Water Engineering',code:'CV404',semester:4}, {name:'Irrigation Engineering',code:'CV405',semester:4}
  ]
};

function makeAttendance(studentId, courseId, total=40) {
  const records = [];
  const baseDate = new Date('2026-01-05'); // Monday
  let dayOffset = 0;
  for (let i = 0; i < total; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayOffset);
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) { dayOffset++; date.setDate(date.getDate() + 1); }
    dayOffset++;
    // 85% chance present, 10% absent, 5% late
    const roll = Math.random();
    const status = roll < 0.85 ? 'present' : roll < 0.95 ? 'absent' : 'late';
    
    // YYYY-MM-DD local format logic robust against timezone shifts
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    const dateStr = `${y}-${m}-${d}`;
    
    records.push({ studentId, courseId, date: dateStr, status, isLocked: true, excludeFromCalc: false });
  }
  return records;
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.\n');

  console.log('Clearing data...');
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Faculty.deleteMany({}),
    Course.deleteMany({}),
    Attendance.deleteMany({}),
    Marks.deleteMany({}),
    Timetable.deleteMany({}),
  ]);
  console.log('Cleared.\n');

  // Admin
  const adminUser = await User.create({name:'Admin',email:'admin@college.edu',password:'Admin@123',role:'admin'});
  console.log('Admin: admin@college.edu / Admin@123');

  // STEP 1: COURSES
  const courseMap = {}; 
  for (const dept of DEPTS) {
    const coursesToCreate = DEPT_COURSES[dept].map(c => ({...c, department: dept}));
    courseMap[dept] = await Course.insertMany(coursesToCreate);
  }
  console.log(`${Object.values(courseMap).flat().length} courses created.\n`);

  // STEP 2: FACULTY
  const facultyMap = {}; 
  let fTotal = 0;
  for (const dept of DEPTS) {
    facultyMap[dept] = [];
    const dSlug = dept.toLowerCase();
    const courses = courseMap[dept];
    
    let courseIndex = 0;
    for (let i = 0; i < 5; i++) { // 5 faculty per dept to handle 20 courses (4 each)
      const name  = getName(600 + fTotal);
      const email = `${dSlug}.faculty${i+1}@college.edu`;
      const user  = await User.create({name,email,password:'Pass@123',role:'faculty'});
      
      const assigned = [];
      for(let j=0; j<4; j++) {
        if (courses[courseIndex]) {
          assigned.push(courses[courseIndex]._id);
          courseIndex++;
        }
      }
      
      const fac = await Faculty.create({userId:user._id, department:dept, designation:DESIGNATIONS[i], assignedCourses:assigned});
      facultyMap[dept].push(fac);
      
      // Update Database relation
      await Course.updateMany({ _id: { $in: assigned } }, { $set: { facultyId: fac._id } });
      
      // Update our internal memory model so Step 4 captures correct ObjectIds inside Timetable iteration
      for(const c of courses) {
         if(assigned.some(id => id.equals(c._id))) c.facultyId = fac._id;
      }
      
      fTotal++;
    }
    console.log(`  Faculty [${dept}]: ${dSlug}.faculty1-5@college.edu (Assigned 4 courses each)`);
  }
  console.log(`\n${fTotal} faculty created.\n`);

  // STEP 4: TIMETABLE
  const days = [1, 2, 3, 4, 5]; // Mon=1, ... Fri=5
  const timeSlots = [
    { start: '09:00', end: '09:50' }, // Forenoon 1
    { start: '09:50', end: '10:40' }, // Forenoon 2
    { start: '10:50', end: '11:40' }, // Forenoon 3 (after 10m break)
    { start: '11:40', end: '12:30' }, // Forenoon 4
    // Lunch 12:30 - 13:30
    { start: '13:30', end: '14:20' }, // Afternoon 1
    { start: '14:20', end: '15:10' }, // Afternoon 2
    { start: '15:20', end: '16:10' }  // Afternoon 3 (after 10m break)
  ];

  const timetableEntries = [];
  const facultySchedule = {};
  const semesterSchedule = {};

  for (const dept of DEPTS) {
      const courses = courseMap[dept];
      for (const c of courses) {
        const facultyId = c.facultyId.toString();
        const semKey = `${dept}-${c.semester}`;
        
        if (!facultySchedule[facultyId]) facultySchedule[facultyId] = new Set();
        if (!semesterSchedule[semKey]) semesterSchedule[semKey] = new Set();
        
        // Exact 1 period per day (Mon-Fri) for each subject
        for (const d of days) {
            for (let t = 0; t < timeSlots.length; t++) {
                const slotKey = `${d}-${t}`;
                
                // If this slot is completely free for both the Faculty and the Semester students
                if (!facultySchedule[facultyId].has(slotKey) && !semesterSchedule[semKey].has(slotKey)) {
                    facultySchedule[facultyId].add(slotKey);
                    semesterSchedule[semKey].add(slotKey);
                    
                    timetableEntries.push({
                        facultyId: c.facultyId,
                        courseId: c._id,
                        dayOfWeek: d,
                        startTime: timeSlots[t].start,
                        endTime: timeSlots[t].end,
                        room: `${dept}-${c.semester}01`,
                        semester: c.semester
                    });
                    
                    break; // Successfully assigned for this day, move to next day
                }
            }
        }
      }
  }

  if (timetableEntries.length) {
    await Timetable.insertMany(timetableEntries);
  }
  console.log(`Timetable seed complete: ${timetableEntries.length} entries created.\n`);

  // STEP 3: STUDENTS + STEP 5: MARKS + STEP 6: ATTENDANCE
  let sTotal = 0;
  const examTypes = ['Internal 1', 'Internal 2', 'Model', 'Semester'];

  for (const dept of DEPTS) {
    const dSlug = dept.toLowerCase();
    const prefix = PREFIXES[dSlug] || dSlug;
    let deptStudentIndex = 1;
    
    for (const sem of SEMESTERS) {
      const semCourses = courseMap[dept].filter(c => c.semester === sem);
      const enrolledIds = semCourses.map(c => c._id);
      
      let attBulk = [];
      let marksBulk = [];

      for (let i = 0; i < 10; i++) { // 10 students per semester array
        const name     = getName(sTotal);
        const rollNum  = (sem * 100) + i + 1; // e.g. 101, 201 
        const rollNo   = `${prefix}25${String(rollNum).padStart(3,'0')}`; 
        const email    = `${dSlug}.s${String(deptStudentIndex).padStart(3, '0')}@college.edu`;
        deptStudentIndex++;
        
        const user = await User.create({name,email,password:'Pass@123',role:'student'});
        const stu  = await Student.create({userId:user._id, rollNo, department:dept, semester:sem, enrolledCourses:enrolledIds});

        for (const courseId of enrolledIds) {
          // Attendance 
          const totalClasses = Math.floor(Math.random() * 21) + 30; // 30 - 50 
          const recs = makeAttendance(stu._id, courseId, totalClasses);
          attBulk.push(...recs);

          // Marks
          for (const et of examTypes) {
            const maxScore = et === 'Semester' ? 100 : 50;
            const minScore = maxScore * 0.4;
            const score = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;

            marksBulk.push({
              courseId,
              studentId: stu._id,
              examType: et,
              score,
              maxScore,
              percentage: Math.round((score/maxScore)*100)
            });
          }
        }
        sTotal++;
      }
      
      // Process database chunks per semester avoiding heap allocation crashes
      if (attBulk.length)   await Attendance.insertMany(attBulk, {ordered:false}).catch(()=>{});
      if (marksBulk.length) await Marks.insertMany(marksBulk, {ordered:false}).catch(()=>{});
    }
    console.log(`  Students [${dept}]: generated for 4 semesters (total 40 students).`);
  }

  const attCount   = await Attendance.countDocuments();
  const marksCount = await Marks.countDocuments();

  console.log(`\n${'─'.repeat(55)}`);
  console.log(`SEED COMPLETE`);
  console.log(`${'─'.repeat(55)}`);
  console.log(`  Departments : ${DEPTS.length} (4 Primary)`);
  console.log(`  Students    : ${sTotal}`);
  console.log(`  Faculty     : ${fTotal}`);
  console.log(`  Courses     : ${Object.values(courseMap).flat().length}`);
  console.log(`  Timetable   : ${timetableEntries.length} entries`);
  console.log(`  Attendance  : ${attCount} records`);
  console.log(`  Marks       : ${marksCount} records`);
  console.log(`${'─'.repeat(55)}`);
  console.log(`  Admin   : admin@college.edu / Admin@123`);
  console.log(`  Faculty : cse.faculty1@college.edu / Pass@123`);
  console.log(`  Student : cse.s001@college.edu / Pass@123`);
  console.log(`${'─'.repeat(55)}\n`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err.message); process.exit(1); });