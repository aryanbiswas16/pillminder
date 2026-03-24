const express = require('express');
const { User, Medication, Schedule, Dose, CareRelationship } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Unified staff dashboard — works for both caregiver (family) and nurse (professional)
router.get('/caregiver', authenticate, authorize('caregiver', 'nurse'), async (req, res) => {
  try {
    const isNurse = req.user.role === 'nurse';

    // Get all residents this user manages
    const relationships = await CareRelationship.findAll({
      where: { caregiverId: req.user.id },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'room', 'isActive']
      }]
    });

    const dashboard = [];

    for (const rel of relationships) {
      const resident = rel.patient;

      // Get today's doses
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayDoses = await Dose.findAll({
        where: {
          residentId: resident.id,
          scheduledTime: { [Op.gte]: today, [Op.lt]: tomorrow }
        },
        include: [{ model: Medication, attributes: ['name', 'color'] }]
      });

      const totalDoses = todayDoses.length;
      const takenDoses = todayDoses.filter(d => d.status === 'taken').length;
      const missedDoses = todayDoses.filter(d => d.status === 'missed');
      const pendingDoses = todayDoses.filter(d => d.status === 'pending');

      const now = new Date();
      const overdueDoses = pendingDoses.filter(d => new Date(d.scheduledTime) < now);

      const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

      dashboard.push({
        residentId: resident.id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        relationship: rel.relationshipType,
        room: resident.room,
        todayStatus: {
          total: totalDoses,
          taken: takenDoses,
          missed: missedDoses.length,
          pending: pendingDoses.length,
          overdue: overdueDoses.length,
          adherenceRate
        },
        hasAlert: missedDoses.length > 0 || overdueDoses.length > 0,
        missedDoses: missedDoses.map(d => ({
          id: d.id,
          medicationName: d.Medication?.name,
          scheduledTime: d.scheduledTime,
          color: d.Medication?.color
        })),
        overdueDoses: overdueDoses.map(d => ({
          id: d.id,
          medicationName: d.Medication?.name,
          scheduledTime: d.scheduledTime,
          color: d.Medication?.color,
          minutesOverdue: Math.floor((now - new Date(d.scheduledTime)) / 60000)
        }))
      });
    }

    // Sort: attention-needed first, then alphabetically
    dashboard.sort((a, b) => {
      if (a.hasAlert !== b.hasAlert) return a.hasAlert ? -1 : 1;
      return a.residentName.localeCompare(b.residentName);
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching staff dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard.' });
  }
});

// Keep /nurse as alias so old bookmarks still work
router.get('/nurse', authenticate, authorize('nurse', 'caregiver'), async (req, res) => {
  // Delegate to unified handler
  req.url = '/caregiver';
  return router.handle(req, res);
});

// Get detailed adherence history for a specific resident
router.get('/resident/:residentId/history', authenticate, async (req, res) => {
  try {
    const { residentId } = req.params;
    const { days = 7 } = req.query;

    // Verify access
    const hasAccess = await CareRelationship.findOne({
      where: {
        residentId,
        caregiverId: req.user.id
      }
    });

    if (!hasAccess && req.user.id !== residentId && req.user.role !== 'admin' && req.user.role !== 'nurse') {
      return res.status(403).json({ error: 'Not authorized to view this resident.' });
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const doses = await Dose.findAll({
      where: {
        residentId,
        scheduledTime: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [{
        model: Medication,
        attributes: ['name', 'color', 'icon']
      }],
      order: [['scheduledTime', 'DESC']]
    });

    // Group by date
    const history = {};
    doses.forEach(dose => {
      const date = new Date(dose.scheduledTime).toISOString().split('T')[0];
      if (!history[date]) {
        history[date] = {
          date,
          doses: [],
          adherenceRate: 0
        };
      }
      history[date].doses.push({
        id: dose.id,
        medicationName: dose.Medication.name,
        color: dose.Medication.color,
        icon: dose.Medication.icon,
        scheduledTime: dose.scheduledTime,
        status: dose.status,
        takenAt: dose.takenAt
      });
    });

    // Calculate adherence for each day
    Object.values(history).forEach(day => {
      const total = day.doses.length;
      const taken = day.doses.filter(d => d.status === 'taken').length;
      day.adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;
    });

    res.json(Object.values(history));
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history.' });
  }
});

module.exports = router;
