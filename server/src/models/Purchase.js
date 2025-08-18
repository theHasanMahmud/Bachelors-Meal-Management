import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    purchasedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

PurchaseSchema.virtual('totalCost').get(function () {
  return this.quantity * this.price;
});

export default mongoose.model('Purchase', PurchaseSchema);
