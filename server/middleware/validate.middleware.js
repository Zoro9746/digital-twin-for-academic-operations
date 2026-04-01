const { validationResult } = require('express-validator');

// Centralized request validation error handling.
// If there are validation errors, respond with:
//   400 { message: "Validation failed", errors: [...] }
const validateRequest = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.array({ onlyFirstError: true }),
    });
  }
  return next();
};

module.exports = { validateRequest };

