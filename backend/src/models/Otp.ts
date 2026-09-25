import mongoose, { Schema } from 'mongoose';
// New collection invalidates legacy plaintext OTPs.
export default mongoose.model('EmailChallenge', new Schema({
  _id: { type: String, required: true },
  hash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  ready: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, required: true }
}));
