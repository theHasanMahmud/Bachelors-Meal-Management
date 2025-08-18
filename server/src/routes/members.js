import express from "express";
import Member from "../models/Member.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const members = await Member.find({}).sort({ createdAt: 1 });
  res.json(members);
});

router.post("/", async (req, res) => {
  try {
    const { name, active = true } = req.body;
    const member = await Member.create({ name, active });
    res.status(201).json(member);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, active } = req.body;
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { name, active },
      { new: true, runValidators: true }
    );
    if (!member) return res.status(404).json({ message: "Not found" });
    res.json(member);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  const deleted = await Member.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export default router;
