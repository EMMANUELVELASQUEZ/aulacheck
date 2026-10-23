const express = require('express');
const router = express.Router();

// GET / - Landing page
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('index', { title: 'AulaCheck - Sistema de Diagnóstico de Aulas Híbridas UV', layout: 'auth' });
});

module.exports = router;
