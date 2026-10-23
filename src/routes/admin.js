const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAuthenticated, isAdmin } = require('../middlewares/auth');

router.use(isAuthenticated, isAdmin);

router.get('/', adminController.index);

// Usuarios
router.get('/usuarios', adminController.usuarios);
router.get('/usuarios/nuevo', adminController.nuevoUsuario);
router.post('/usuarios', adminController.crearUsuario);
router.get('/usuarios/:id/edit', adminController.editarUsuario);
router.put('/usuarios/:id', adminController.actualizarUsuario);
router.post('/usuarios/:id/toggle', adminController.toggleUsuario);

// Aulas
router.get('/aulas', adminController.aulas);
router.get('/aulas/nueva', adminController.nuevaAula);
router.post('/aulas', adminController.crearAula);
router.get('/aulas/:id/edit', adminController.editarAula);
router.put('/aulas/:id', adminController.actualizarAula);

module.exports = router;
