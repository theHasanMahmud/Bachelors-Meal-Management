import express from 'express';
import Purchase from '../models/Purchase.js';

const router = express.Router();

// Create purchase
router.post('/', async (req, res) => {
  try {
    const { itemName, quantity, price, purchasedAt, notes } = req.body;
    const purchase = await Purchase.create({ itemName, quantity, price, purchasedAt, notes });
    res.status(201).json(purchase);
  } catch (error) {
    res.status(400).json({ message: 'Failed to create purchase', error: error.message });
  }
});

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const { start, end, q } = req.query;
    const filter = {};
    if (q) filter.itemName = { $regex: new RegExp(q, 'i') };
    if (start || end) {
      filter.purchasedAt = {};
      if (start) filter.purchasedAt.$gte = new Date(start);
      if (end) filter.purchasedAt.$lte = new Date(end);
    }
    const purchases = await Purchase.find(filter).sort({ purchasedAt: -1, createdAt: -1 });
    const totals = purchases.reduce(
      (acc, p) => {
        acc.totalQuantity += p.quantity;
        acc.totalAmount += p.quantity * p.price;
        return acc;
      },
      { totalQuantity: 0, totalAmount: 0 }
    );
    res.json({ purchases, totals });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch purchases', error: error.message });
  }
});

// Get one purchase
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (error) {
    res.status(400).json({ message: 'Invalid id', error: error.message });
  }
});

// Update purchase
router.put('/:id', async (req, res) => {
  try {
    const { itemName, quantity, price, purchasedAt, notes } = req.body;
    const updated = await Purchase.findByIdAndUpdate(
      req.params.id,
      { itemName, quantity, price, purchasedAt, notes },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Failed to update purchase', error: error.message });
  }
});

// Delete purchase
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Purchase.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Failed to delete purchase', error: error.message });
  }
});

export default router;
