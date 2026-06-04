import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IAdminUser extends Document {
  username: string;
  passwordHash: string;
}

const AdminUserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
});

export const AdminUser: Model<IAdminUser> = mongoose.models.AdminUser || mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);
