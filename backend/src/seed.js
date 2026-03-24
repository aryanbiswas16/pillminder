/**
 * Seeds the database with demo data for PillMinder.
 * Run with: node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, CareRelationship, Medication, Schedule, Dose } = require('./models');

const DEMO_USERS = {
  resident: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'resident@demo.com',
    password: 'demo123',
    firstName: 'Margaret',
    lastName: 'Thompson',
    role: 'resident',
    phone: '555-0101',
    room: '204'
  },
  resident2: {
    id: '11111111-1111-1111-1111-222222222222',
    email: 'resident2@demo.com',
    password: 'demo123',
    firstName: 'Robert',
    lastName: 'Chen',
    role: 'resident',
    phone: '555-0102',
    room: '118'
  },
  resident3: {
    id: '11111111-1111-1111-1111-333333333333',
    email: 'resident3@demo.com',
    password: 'demo123',
    firstName: 'Dorothy',
    lastName: 'Williams',
    role: 'resident',
    phone: '555-0103',
    room: '305'
  },
  caregiver: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'caregiver@demo.com',
    password: 'demo123',
    firstName: 'Sarah',
    lastName: 'Thompson',
    role: 'caregiver',
    phone: '555-0201'
  },
  nurse: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'nurse@demo.com',
    password: 'demo123',
    firstName: 'James',
    lastName: 'Rodriguez',
    role: 'nurse',
    phone: '555-0301'
  }
};

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync tables (force: true drops & recreates)
    await sequelize.sync({ force: true });
    console.log('Tables synced.');

    // ── Create users ──
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const users = {};

    for (const [key, data] of Object.entries(DEMO_USERS)) {
      users[key] = await User.create({ ...data, password: hashedPassword });
      console.log(`  Created user: ${data.firstName} ${data.lastName} (${data.role})`);
    }

    // ── Care Relationships ──
    // Caregiver Sarah manages all three residents (family / friend relationships)
    const caregiverRelationships = [
      { resKey: 'resident',  relationshipType: 'daughter' },
      { resKey: 'resident2', relationshipType: 'son'      },
      { resKey: 'resident3', relationshipType: 'friend'   },
    ];
    for (const { resKey, relationshipType } of caregiverRelationships) {
      await CareRelationship.create({
        residentId: users[resKey].id,
        caregiverId: users.caregiver.id,
        relationshipType,
        canViewHistory: true,
        canModifySchedule: true,
        notificationsEnabled: true
      });
    }

    // Nurse James manages all three residents
    for (const resKey of ['resident', 'resident2', 'resident3']) {
      await CareRelationship.create({
        residentId: users[resKey].id,
        caregiverId: users.nurse.id,
        relationshipType: 'nurse',
        canViewHistory: true,
        canModifySchedule: true,
        notificationsEnabled: true
      });
    }
    console.log('  Care relationships created.');

    // ── Medications & Schedules ──
    const medications = {
      resident: [
        { name: 'Lisinopril', dosage: '10mg tablet', instructions: 'Take with water in the morning', color: '#3B82F6', icon: '💊',
          schedules: [{ timeOfDay: '08:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Metformin', dosage: '500mg tablet', instructions: 'Take with food', color: '#10B981', icon: '💚',
          schedules: [
            { timeOfDay: '08:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] },
            { timeOfDay: '18:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }
          ] },
        { name: 'Calcium + Vitamin D', dosage: '600mg/400IU', instructions: 'Take with lunch', color: '#F59E0B', icon: '☀️',
          schedules: [{ timeOfDay: '12:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Atorvastatin', dosage: '20mg tablet', instructions: 'Take at bedtime', color: '#8B5CF6', icon: '🌙',
          schedules: [{ timeOfDay: '21:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] }
      ],
      resident2: [
        { name: 'Amlodipine', dosage: '5mg tablet', instructions: 'Take in the morning', color: '#EF4444', icon: '❤️',
          schedules: [{ timeOfDay: '07:30', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Omeprazole', dosage: '20mg capsule', instructions: 'Take 30 min before breakfast', color: '#6366F1', icon: '💜',
          schedules: [{ timeOfDay: '07:00', dosageAmount: '1 capsule', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Aspirin', dosage: '81mg tablet', instructions: 'Take with food', color: '#F97316', icon: '🔶',
          schedules: [{ timeOfDay: '12:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] }
      ],
      resident3: [
        { name: 'Levothyroxine', dosage: '50mcg tablet', instructions: 'Take on empty stomach, 30 min before food', color: '#EC4899', icon: '🦋',
          schedules: [{ timeOfDay: '06:30', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Donepezil', dosage: '5mg tablet', instructions: 'Take at bedtime', color: '#14B8A6', icon: '🧠',
          schedules: [{ timeOfDay: '21:00', dosageAmount: '1 tablet', daysOfWeek: [0,1,2,3,4,5,6] }] },
        { name: 'Vitamin B12', dosage: '1000mcg tablet', instructions: 'Take with breakfast', color: '#F59E0B', icon: '⚡',
          schedules: [{ timeOfDay: '08:00', dosageAmount: '1 tablet', daysOfWeek: [1,2,3,4,5] }] }
      ]
    };

    const allSchedules = []; // Will collect { schedule, med, residentId } for dose generation

    for (const [resKey, meds] of Object.entries(medications)) {
      for (const medData of meds) {
        const { schedules, ...medFields } = medData;
        const med = await Medication.create({ ...medFields, residentId: users[resKey].id });

        for (const schedData of schedules) {
          const schedule = await Schedule.create({ ...schedData, medicationId: med.id });
          allSchedules.push({ schedule, med, residentId: users[resKey].id, daysOfWeek: schedData.daysOfWeek });
        }
      }
    }
    console.log('  Medications & schedules created.');

    // ── Generate Doses for past 30 days + today ──
    const now = new Date();
    for (let dayOffset = -30; dayOffset <= 0; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();

      for (const { schedule, med, residentId, daysOfWeek } of allSchedules) {
        // Check if this schedule runs on this day
        if (!daysOfWeek.includes(dayOfWeek)) continue;

        const [hours, minutes] = schedule.timeOfDay.split(':').map(Number);
        const scheduledTime = new Date(date);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // For past days: randomly taken or missed (80% taken)
        // For today: pending if in the future, taken if in the past (70%), missed if past & not taken
        let status = 'pending';
        let takenAt = null;

        if (dayOffset < 0) {
          // Past days
          const rand = Math.random();
          if (rand < 0.80) {
            status = 'taken';
            takenAt = new Date(scheduledTime);
            takenAt.setMinutes(takenAt.getMinutes() + Math.floor(Math.random() * 15));
          } else {
            status = 'missed';
          }
        } else {
          // Today
          if (scheduledTime < now) {
            const rand = Math.random();
            if (rand < 0.70) {
              status = 'taken';
              takenAt = new Date(scheduledTime);
              takenAt.setMinutes(takenAt.getMinutes() + Math.floor(Math.random() * 10));
            } else if (rand < 0.85) {
              status = 'missed';
            } else {
              // pending (overdue)
              status = 'pending';
            }
          }
          // else: future → stays pending
        }

        await Dose.create({
          scheduleId: schedule.id,
          medicationId: med.id,
          residentId,
          scheduledTime,
          status,
          takenAt,
          takenBy: status === 'taken' ? residentId : null
        });
      }
    }
    console.log('  Doses generated for 31 days.');

    console.log('\n✓ Seed complete! Demo accounts:');
    console.log('  Resident:  resident@demo.com  / demo123');
    console.log('  Caregiver: caregiver@demo.com / demo123');
    console.log('  Nurse:     nurse@demo.com     / demo123');

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
