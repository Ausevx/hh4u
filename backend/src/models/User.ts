import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email?: string;
  displayName?: string;
  fullName?: string;
  authProvider: 'email_otp' | 'google' | 'guest';
  googleId?: string;
  avatarUrl?: string;
  phone?: string;
  countryCode?: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  pinCode?: string;
  isProfileComplete?: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  displayName: { type: String, default: '' },
  fullName: { type: String, default: '' },
  authProvider: { type: String, enum: ['email_otp', 'google', 'guest'], required: true },
  googleId: { type: String, sparse: true },
  avatarUrl: { type: String },
  phone: { type: String, default: '' },
  countryCode: { type: String, default: '+91' },
  phoneNumber: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: 'India' },
  pinCode: { type: String, default: '' },
  isProfileComplete: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);
