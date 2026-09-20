import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  email: string;
  passwordHash?: string;
  authProvider: 'password' | 'google';
  role: 'admin'; // Single role for v1
  createdAt: Date;
}

const AdminSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  authProvider: { type: String, enum: ['password', 'google'], required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAdmin>('Admin', AdminSchema);
