const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { loginRules, registerRules, validate } = require('../middlewares/validators');

router.get('/login', authController.getLogin);
router.post('/login', loginLimiter, loginRules, validate('/auth/login'), authController.postLogin);

router.get('/register', authController.getRegister);
router.post('/register', registerRules, validate('/auth/register'), authController.postRegister);

router.get('/logout', authController.logout);

module.exports = router;
