import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Database routes - em desenvolvimento' });
});

export default router; 