const express = require('express');
const router = express.Router();
const estadisticasController = require('../controllers/estadisticasController');
const { isAuthenticated, isTecnico } = require('../middlewares/auth');

router.get('/', isAuthenticated, isTecnico, estadisticasController.index);

module.exports = router;
