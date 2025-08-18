import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './db.js';
import purchasesRouter from './routes/purchases.js';
import membersRouter from './routes/members.js';
import mealsRouter from './routes/meals.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'meal-management-api' });
});

app.use('/api/purchases', purchasesRouter);
app.use('/api/members', membersRouter);
app.use('/api/meals', mealsRouter);

async function start() {
  try {
    await connectToDatabase();
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
