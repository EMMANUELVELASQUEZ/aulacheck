const { body, validationResult } = require('express-validator');

const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es requerido.')
    .isEmail().withMessage('Ingresa un correo electrónico válido.'),
  body('password')
    .notEmpty().withMessage('La contraseña es requerida.'),
];

const registerRules = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre completo es requerido.')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s.]+$/).withMessage('El nombre solo puede contener letras y espacios.'),
  body('email')
    .trim()
    .notEmpty().withMessage('El correo electrónico es requerido.')
    .isEmail().withMessage('Ingresa un correo electrónico válido.'),
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula.')
    .matches(/[0-9]/).withMessage('La contraseña debe contener al menos un número.'),
  body('confirmar_password').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Las contraseñas no coinciden.');
    return true;
  }),
];

const validate = (redirectUrl) => (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array()[0].msg);
    return res.redirect(redirectUrl);
  }
  next();
};

module.exports = { loginRules, registerRules, validate };
