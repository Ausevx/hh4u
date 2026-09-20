import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  displayName?: string;
  authProvider: 'email_otp' | 'google' | 'guest';
  googleId?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  displayName: { type: String, default: '' },
  authProvider: { type: String, enum: ['email_otp', 'google', 'guest'], required: true },
  googleId: { type: String, sparse: true },
  avatarUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
