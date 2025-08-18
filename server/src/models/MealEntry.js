import mongoose from "mongoose";

const MealEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    items: [{ type: String, trim: true }], // items used that day (names)
    entries: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
        meals: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

MealEntrySchema.index({ date: 1 });

export default mongoose.model("MealEntry", MealEntrySchema);
