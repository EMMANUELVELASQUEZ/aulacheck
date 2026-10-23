const express = require('express');
const router = express.Router();
const incidenciaController = require('../controllers/incidenciaController');
const { isAuthenticated, isTecnico } = require('../middlewares/auth');

router.get('/', isAuthenticated, incidenciaController.index);
router.get('/nueva', isAuthenticated, incidenciaController.nueva);
router.post('/', isAuthenticated, incidenciaController.crear);
router.get('/:id', isAuthenticated, incidenciaController.detalle);
router.post('/:id/seguimiento', isAuthenticated, incidenciaController.agregarSeguimiento);
router.put('/:id', isAuthenticated, isTecnico, incidenciaController.actualizar);

module.exports = router;
