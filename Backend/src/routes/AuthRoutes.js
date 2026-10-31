import { Router } from 'express';
import { getHealth } from '../controllers/authController.js';

const router = Router();

//* Endpoint a controlador

router.get('/health', getHealth);

export default router;