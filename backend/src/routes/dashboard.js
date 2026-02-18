const express = require('express');
const { User, Medication, Schedule, Dose, CareRelationship } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get caregiver dashboard (for family members)
router.get('/caregiver', authenticate, authorize('caregiver'), async (req, res) => {
  try {
    // Get all residents this caregiver manages
    const relationships = await CareRelationship.findAll({
      where: { caregiverId: req.user.id },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'firstName', 'lastName', 'isActive']
      }]
    });

    const dashboard = [];

    for (const rel of relationships) {
      const resident = rel.patient;
      
      // Get today's status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayDoses = await Dose.findAll({
        where: {
          residentId: resident.id,
          scheduledTime: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      });

      const totalDoses = todayDoses.length;
      const takenDoses = todayDoses.filter(d => d.status === 'taken').length;
      const missedDoses = todayDoses.filter(d => d.status === 'missed').length;
      const pendingDoses = todayDoses.filter(d => d.status === 'pending');

      dashboard.push({
        residentId: resident.id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        relationship: rel.relationshipType,
        todayStatus: {
          total: totalDoses,
          taken: takenDoses,
          missed: missedDoses,
          pending: pendingDoses.length,
          adherenceRate: totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100
        },
        hasAlert: missedDoses > 0 || pendingDoses.some(d => {
          const scheduledTime = new Date(d.scheduledTime);
          return scheduledTime < new Date() && d.status === 'pending';
        })
      });
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching caregiver dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard.' });
  }
});

// Get nurse dashboard (for professional caregivers with multiple patients)
router.get('/nurse', authenticate, authorize('nurse'), async (req, res) => {
  try {
    // Get all residents this nurse manages
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
      
      // Get today's status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayDoses = await Dose.findAll({
        where: {
          residentId: resident.id,
          scheduledTime: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        },
        include: [{
          model: Medication,
          attributes: ['name', 'color']
        }]
      });

      const totalDoses = todayDoses.length;
      const takenDoses = todayDoses.filter(d => d.status === 'taken').length;
      const missedDoses = todayDoses.filter(d => d.status === 'missed');
      const pendingDoses = todayDoses.filter(d => d.status === 'pending');

      // Find overdue doses
      const now = new Date();
      const overdueDoses = pendingDoses.filter(d => {
        const scheduledTime = new Date(d.scheduledTime);
        return scheduledTime < now;
      });

      dashboard.push({
        residentId: resident.id,
        residentName: `${resident.firstName} ${resident.lastName}`,
        room: resident.room,
        todayStatus: {
          total: totalDoses,
          taken: takenDoses,
          missed: missedDoses.length,
          pending: pendingDoses.length,
          overdue: overdueDoses.length
        },
        missedDoses: missedDoses.map(d => ({
          id: d.id,
          medicationName: d.Medication.name,
          scheduledTime: d.scheduledTime,
          color: d.Medication.color
        })),
        overdueDoses: overdueDoses.map(d => ({
          id: d.id,
          medicationName: d.Medication.name,
          scheduledTime: d.scheduledTime,
          color: d.Medication.color,
          minutesOverdue: Math.floor((now - new Date(d.scheduledTime)) / 60000)
        })),
        priority: overdueDoses.length > 0 ? 'high' : missedDoses.length > 0 ? 'medium' : 'low'
      });
    }

    // Sort by priority (high first, then by room number)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    dashboard.sort((a, b) => {
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.room || '').localeCompare(b.room || '');
    });

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching nurse dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard.' });
  }
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

    if (!hasAccess && req.user.id !== residentId && req.user.role !== 'admin') {
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
