import { Router } from 'express';
import AppController from '../controllers/AppController.js';

const router = Router();

// Define routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
