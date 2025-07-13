import express from 'express';
import { getWallet, createDepositIntent, confirmDeposit } from '../controller/walletController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, getWallet);
router.post('/deposit/intent', authenticateToken, createDepositIntent);
router.post('/deposit/confirm', authenticateToken, confirmDeposit);

export default router;