const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const donorController = require('../controllers/donorController');
const { authenticate } = require('../middleware/auth');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getCurrentUser);

router.get('/donors', authenticate, donorController.getAllDonors);
router.post('/donors', authenticate, donorController.createDonor);

module.exports = router;
