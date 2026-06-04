import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGalleryImage extends Document {
  title: string;
  category: string;
  url: string;
  description?: string;
  createdAt: Date;
}

const GalleryImageSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    default: 'Editorial',
  },
  url: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    maxLength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster retrieval sorting
GalleryImageSchema.index({ createdAt: -1 });

export const GalleryImage: Model<IGalleryImage> = mongoose.models.GalleryImage || mongoose.model<IGalleryImage>('GalleryImage', GalleryImageSchema);
