import mongoose, { Schema, Document } from 'mongoose';

export interface IAppDatabaseVersion extends Document {
  versionNumber: number;
  publishedAt: Date;
  publishedBy: mongoose.Types.ObjectId;
  changelogNote?: string;
  snapshotUrl: string;
  isLive: boolean;
}

const AppDatabaseVersionSchema: Schema = new Schema({
  versionNumber: { type: Number, required: true, unique: true },
  publishedAt: { type: Date, default: Date.now },
  publishedBy: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  changelogNote: { type: String },
  snapshotUrl: { type: String, required: true },
  isLive: { type: Boolean, default: false }
});

export default mongoose.model<IAppDatabaseVersion>('AppDatabaseVersion', AppDatabaseVersionSchema);
