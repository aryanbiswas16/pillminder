const express = require('express');
const { body, param } = require('express-validator');
const { Medication, Schedule, Dose, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all medications for a resident
router.get('/my-medications', authenticate, async (req, res) => {
  try {
    const medications = await Medication.findAll({
      where: { residentId: req.user.id, isActive: true },
      include: [{
        model: Schedule,
        where: { isActive: true },
        required: false
      }]
    });

    res.json(medications);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Failed to fetch medications.' });
  }
});

// Get today's medication schedule with doses
router.get('/today-schedule', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayOfWeek = today.getDay();

    const medications = await Medication.findAll({
      where: { residentId: req.user.id, isActive: true },
      include: [{
        model: Schedule,
        where: { 
          isActive: true,
          daysOfWeek: { [Op.contains]: [dayOfWeek] }
        },
        required: true,
        include: [{
          model: Dose,
          where: {
            scheduledTime: {
              [Op.gte]: today,
              [Op.lt]: tomorrow
            }
          },
          required: false
        }]
      }]
    });

    // Flatten into time-ordered schedule
    const schedule = [];
    medications.forEach(med => {
      med.Schedules.forEach(sch => {
        schedule.push({
          doseId: sch.Doses[0]?.id || null,
          scheduleId: sch.id,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          instructions: med.instructions,
          color: med.color,
          icon: med.icon,
          timeOfDay: sch.timeOfDay,
          dosageAmount: sch.dosageAmount,
          status: sch.Doses[0]?.status || 'pending',
          takenAt: sch.Doses[0]?.takenAt || null
        });
      });
    });

    // Sort by time
    schedule.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching today schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
});

// Log a dose as taken (one-tap action for residents)
router.post('/take-dose/:doseId', authenticate, [
  param('doseId').isUUID()
], async (req, res) => {
  try {
    const { doseId } = req.params;

    const dose = await Dose.findByPk(doseId, {
      include: [{
        model: Medication,
        include: [{ model: User, as: 'resident' }]
      }]
    });

    if (!dose) {
      return res.status(404).json({ error: 'Dose not found.' });
    }

    // Verify the user is the resident or authorized caregiver
    if (dose.residentId !== req.user.id && req.user.role !== 'nurse') {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    dose.status = 'taken';
    dose.takenAt = new Date();
    dose.takenBy = req.user.id;
    await dose.save();

    // Emit real-time update to caregivers
    req.io.to(`user_${dose.residentId}`).emit('dose_taken', {
      doseId: dose.id,
      medicationName: dose.Medication.name,
      takenAt: dose.takenAt,
      residentId: dose.residentId,
      residentName: `${dose.Medication.resident.firstName} ${dose.Medication.resident.lastName}`
    });

    res.json({ 
      success: true, 
      message: 'Dose marked as taken',
      dose: {
        id: dose.id,
        status: dose.status,
        takenAt: dose.takenAt
      }
    });
  } catch (error) {
    console.error('Error taking dose:', error);
    res.status(500).json({ error: 'Failed to log dose.' });
  }
});

// Create a new medication (for caregivers/nurses)
router.post('/', authenticate, authorize('caregiver', 'nurse'), [
  body('residentId').isUUID(),
  body('name').trim().notEmpty(),
  body('dosage').trim().notEmpty(),
  body('schedules').isArray({ min: 1 })
], async (req, res) => {
  try {
    const { residentId, name, dosage, instructions, color, icon, schedules } = req.body;

    const medication = await Medication.create({
      residentId,
      name,
      dosage,
      instructions,
      color: color || '#3B82F6',
      icon: icon || '💊'
    });

    // Create schedules
    for (const sched of schedules) {
      await Schedule.create({
        medicationId: medication.id,
        timeOfDay: sched.timeOfDay,
        daysOfWeek: sched.daysOfWeek || [0,1,2,3,4,5,6],
        dosageAmount: sched.dosageAmount || '1'
      });
    }

    res.status(201).json({
      message: 'Medication created successfully',
      medication
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    res.status(500).json({ error: 'Failed to create medication.' });
  }
});

module.exports = router;
