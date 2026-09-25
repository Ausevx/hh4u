import mongoose, { Schema } from 'mongoose';
export default mongoose.model('RevokedToken', new Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}));
