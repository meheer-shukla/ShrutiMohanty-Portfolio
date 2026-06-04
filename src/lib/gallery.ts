import connectToDatabase from './mongodb';
import { GalleryImage } from '@/models/GalleryImage';
import fs from 'fs';
import path from 'path';

export async function getGalleryImages() {
  try {
    // If MongoDB URI is configured, fetch from MongoDB
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      const images = await GalleryImage.find({}).sort({ createdAt: -1 });
      return images.map(img => ({
        id: img._id.toString(),
        title: img.title,
        category: img.category,
        url: img.url,
        createdAt: img.createdAt
      }));
    }

    // Local fallback for development without MongoDB
    const localPath = path.join(process.cwd(), 'src', 'data', 'gallery.json');
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(content);
    }
    return [];
  } catch (e) {
    console.error("Failed to get gallery images:", e);
    return [];
  }
}
