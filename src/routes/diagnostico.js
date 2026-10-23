const express = require('express');
const router = express.Router();
const diagnosticoController = require('../controllers/diagnosticoController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', isAuthenticated, diagnosticoController.index);
router.post('/', isAuthenticated, diagnosticoController.postDiagnostico);

module.exports = router;
