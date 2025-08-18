import express from "express";
import MealEntry from "../models/MealEntry.js";

const router = express.Router();

// GET /api/meals?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/", async (req, res) => {
  const { start, end } = req.query;
  const filter = {};
  if (start || end) {
    filter.date = {};
    if (start) filter.date.$gte = new Date(start);
    if (end) filter.date.$lte = new Date(end);
  }
  const list = await MealEntry.find(filter)
    .populate("entries.member")
    .sort({ date: -1 });
  res.json(list);
});

// POST /api/meals
router.post("/", async (req, res) => {
  try {
    const { date, items = [], entries = [] } = req.body;
    const doc = await MealEntry.create({ date, items, entries });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PUT /api/meals/:id
router.put("/:id", async (req, res) => {
  try {
    const { date, items, entries } = req.body;
    const updated = await MealEntry.findByIdAndUpdate(
      req.params.id,
      { date, items, entries },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/meals/:id
router.delete("/:id", async (req, res) => {
  const deleted = await MealEntry.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export default router;
