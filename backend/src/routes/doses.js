const express = require('express');
const router = express.Router();

// Minimal doses routes stub
router.get('/', (req, res) => {
  res.json({ message: 'Doses list (stub)', doses: [] });
});

router.post('/', (req, res) => {
  res.status(201).json({ message: 'Doses create (stub)' });
});

module.exports = router;
