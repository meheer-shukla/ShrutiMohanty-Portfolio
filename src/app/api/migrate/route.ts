import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import connectToDatabase from '@/lib/mongodb';
import { GalleryImage } from '@/models/GalleryImage';
import { verifyAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    // SECURITY: Verify JWT Auth Token before allowing migration
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const execute = searchParams.get('execute');

    if (execute !== 'true') {
      return NextResponse.json({ 
        message: 'This script migrates data from Vercel Blob manifest.json (or local gallery.json) to MongoDB. Append ?execute=true to run the migration.'
      });
    }

    let existingData: { id: string; url: string; title: string; category?: string }[] = [];

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { blobs } = await list({ prefix: 'manifest.json' });
      const manifestBlob = blobs.find(b => b.pathname === 'manifest.json');
      
      if (manifestBlob) {
        const res = await fetch(manifestBlob.downloadUrl, { cache: 'no-store' });
        if (res.ok) {
          existingData = await res.json();
        }
      }
    } else {
      const dataFilePath = path.join(process.cwd(), 'src', 'data', 'gallery.json');
      if (fs.existsSync(dataFilePath)) {
        existingData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
      }
    }

    if (existingData.length === 0) {
      return NextResponse.json({ message: 'No existing data found to migrate.' });
    }

    await connectToDatabase();

    let migratedCount = 0;
    let skippedCount = 0;

    for (const item of existingData) {
      // Check if URL already exists in MongoDB
      const exists = await GalleryImage.findOne({ url: item.url });
      if (!exists) {
        await GalleryImage.create({
          title: item.title,
          category: item.category || 'Editorial',
          url: item.url,
          // Convert timestamp ID to valid date if possible, otherwise use now
          createdAt: new Date(parseInt(item.id)) || new Date()
        });
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Migration complete. Migrated: ${migratedCount}, Skipped (Already exists): ${skippedCount}`
    });
  } catch (error: unknown) {
    console.error("Migration Error:", error);
    const message = error instanceof Error ? error.message : 'Failed to migrate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
