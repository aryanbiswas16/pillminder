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
        where: { isActive: true },
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

    // Filter schedules by day-of-week in JS (Op.contains doesn't work with SQLite JSON)
    medications.forEach(med => {
      med.Schedules = med.Schedules.filter(sch => {
        const days = typeof sch.daysOfWeek === 'string' ? JSON.parse(sch.daysOfWeek) : sch.daysOfWeek;
        return Array.isArray(days) && days.includes(dayOfWeek);
      });
    });
    // Remove medications with no matching schedules for today
    const filteredMeds = medications.filter(med => med.Schedules.length > 0);

    // Ensure every active schedule has a dose row for today so the UI can reliably
    // mark taken/undo actions using a concrete doseId.
    for (const med of filteredMeds) {
      for (const sch of med.Schedules) {
        if (sch.Doses && sch.Doses.length > 0) continue;

        const [hours, minutes] = String(sch.timeOfDay)
          .split(':')
          .slice(0, 2)
          .map(Number);
        const scheduledTime = new Date(today);
        scheduledTime.setHours(hours || 0, minutes || 0, 0, 0);

        const createdDose = await Dose.create({
          scheduleId: sch.id,
          medicationId: med.id,
          residentId: med.residentId,
          scheduledTime,
          status: 'pending'
        });

        sch.Doses = [createdDose];
      }
    }

    // Flatten into time-ordered schedule
    const schedule = [];
    filteredMeds.forEach(med => {
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

// Undo a dose (mark taken back to pending, or mark missed as taken-late)
router.post('/undo-dose/:doseId', authenticate, [
  param('doseId').isUUID()
], async (req, res) => {
  try {
    const { doseId } = req.params;
    const { action } = req.body; // 'undo' | 'take-late'

    const dose = await Dose.findByPk(doseId);
    if (!dose) return res.status(404).json({ error: 'Dose not found.' });
    if (dose.residentId !== req.user.id && req.user.role !== 'nurse') {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    if (action === 'take-late') {
      dose.status = 'taken';
      dose.takenAt = new Date();
      dose.takenBy = req.user.id;
    } else {
      // undo: reset to pending
      dose.status = 'pending';
      dose.takenAt = null;
      dose.takenBy = null;
    }
    await dose.save();

    res.json({ success: true, status: dose.status, takenAt: dose.takenAt });
  } catch (error) {
    console.error('Error updating dose:', error);
    res.status(500).json({ error: 'Failed to update dose.' });
  }
});

// ── Dose history (last 30 days of doses + streaks) ──
router.get('/dose-history', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const doses = await Dose.findAll({
      where: {
        residentId: req.user.id,
        scheduledTime: { [Op.gte]: startDate }
      },
      include: [{ model: Medication, attributes: ['id', 'name', 'dosage', 'color', 'icon'] }],
      order: [['scheduledTime', 'DESC']]
    });

    // Group by date
    const byDate = {};
    doses.forEach(d => {
      const dateKey = new Date(d.scheduledTime).toISOString().slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({
        id: d.id,
        medicationName: d.Medication?.name || 'Unknown',
        dosage: d.Medication?.dosage || '',
        color: d.Medication?.color || '#3B82F6',
        icon: d.Medication?.icon || '💊',
        status: d.status,
        scheduledTime: d.scheduledTime,
        takenAt: d.takenAt
      });
    });

    // Build day summaries (sorted newest first)
    const daySummaries = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map(date => {
      const dayDoses = byDate[date];
      const total = dayDoses.length;
      const taken = dayDoses.filter(d => d.status === 'taken').length;
      const missed = dayDoses.filter(d => d.status === 'missed').length;
      const pending = dayDoses.filter(d => d.status === 'pending').length;
      return { date, total, taken, missed, pending, pct: total > 0 ? Math.round((taken / total) * 100) : 0, doses: dayDoses };
    });

    // Calculate streaks (consecutive days with 100% adherence)
    // Sort days oldest → newest for streak calc
    const sortedDays = [...daySummaries].sort((a, b) => a.date.localeCompare(b.date));
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Walk from oldest to newest
    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      // Don't count today's pending doses against streak
      const isToday = day.date === now.toISOString().slice(0, 10);
      const perfect = isToday ? (day.missed === 0) : (day.pct === 100 && day.total > 0);

      if (perfect) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
    currentStreak = tempStreak;

    // Overall stats
    const totalDoses = doses.length;
    const totalTaken = doses.filter(d => d.status === 'taken').length;
    const totalMissed = doses.filter(d => d.status === 'missed').length;
    const overallPct = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;

    // Per-medication stats
    const medStats = {};
    doses.forEach(d => {
      const name = d.Medication?.name || 'Unknown';
      if (!medStats[name]) medStats[name] = { name, total: 0, taken: 0, icon: d.Medication?.icon || '💊', color: d.Medication?.color || '#3B82F6' };
      medStats[name].total++;
      if (d.status === 'taken') medStats[name].taken++;
    });
    const medicationStats = Object.values(medStats).map(m => ({
      ...m,
      pct: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 0
    })).sort((a, b) => b.pct - a.pct);

    res.json({
      currentStreak,
      bestStreak,
      totalDoses,
      totalTaken,
      totalMissed,
      overallPct,
      medicationStats,
      daySummaries
    });
  } catch (error) {
    console.error('Error fetching dose history:', error);
    res.status(500).json({ error: 'Failed to fetch dose history.' });
  }
});

// Create a new medication (residents add their own, caregivers/nurses add for their residents)
router.post('/', authenticate, [
  body('name').trim().notEmpty(),
  body('dosage').trim().notEmpty(),
  body('schedules').isArray({ min: 1 })
], async (req, res) => {
  try {
    const { residentId, name, dosage, instructions, color, icon, schedules } = req.body;

    // Residents always create for themselves; caregivers supply residentId
    const targetResidentId = req.user.role === 'resident' ? req.user.id : residentId;
    if (!targetResidentId) {
      return res.status(400).json({ error: 'residentId is required for non-resident users.' });
    }

    const medication = await Medication.create({
      residentId: targetResidentId,
      name,
      dosage,
      instructions,
      color: color || '#3B82F6',
      icon: icon || '💊'
    });

    // Create schedules
    const createdSchedules = [];
    for (const sched of schedules) {
      const s = await Schedule.create({
        medicationId: medication.id,
        timeOfDay: sched.timeOfDay,
        daysOfWeek: sched.daysOfWeek || [0,1,2,3,4,5,6],
        dosageAmount: sched.dosageAmount || '1'
      });
      createdSchedules.push(s);
    }

    res.status(201).json({
      message: 'Medication created successfully',
      medication: { ...medication.toJSON(), Schedules: createdSchedules }
    });
  } catch (error) {
    console.error('Error creating medication:', error);
    res.status(500).json({ error: 'Failed to create medication.' });
  }
});

// Update a medication
router.put('/:id', authenticate, [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty(),
  body('dosage').optional().trim().notEmpty()
], async (req, res) => {
  try {
    const medication = await Medication.findByPk(req.params.id);
    if (!medication) return res.status(404).json({ error: 'Medication not found.' });

    // Only owner or caregiver/nurse can edit
    if (medication.residentId !== req.user.id && req.user.role === 'resident') {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    const { name, dosage, instructions, color, icon, isActive, schedules } = req.body;
    if (name) medication.name = name;
    if (dosage) medication.dosage = dosage;
    if (instructions !== undefined) medication.instructions = instructions;
    if (color) medication.color = color;
    if (icon) medication.icon = icon;
    if (isActive !== undefined) medication.isActive = isActive;
    await medication.save();

    // If schedules provided, replace them
    if (schedules && Array.isArray(schedules)) {
      await Schedule.destroy({ where: { medicationId: medication.id } });
      for (const sched of schedules) {
        await Schedule.create({
          medicationId: medication.id,
          timeOfDay: sched.timeOfDay,
          daysOfWeek: sched.daysOfWeek || [0,1,2,3,4,5,6],
          dosageAmount: sched.dosageAmount || '1'
        });
      }
    }

    const updated = await Medication.findByPk(medication.id, {
      include: [{ model: Schedule, required: false }]
    });

    res.json({ message: 'Medication updated', medication: updated });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ error: 'Failed to update medication.' });
  }
});

// Delete (deactivate) a medication
router.delete('/:id', authenticate, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const medication = await Medication.findByPk(req.params.id);
    if (!medication) return res.status(404).json({ error: 'Medication not found.' });

    if (medication.residentId !== req.user.id && req.user.role === 'resident') {
      return res.status(403).json({ error: 'Not authorized.' });
    }

    medication.isActive = false;
    await medication.save();
    res.json({ message: 'Medication removed' });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Failed to delete medication.' });
  }
});

module.exports = router;
