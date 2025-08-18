import mongoose from "mongoose";

const MemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Member", MemberSchema);
