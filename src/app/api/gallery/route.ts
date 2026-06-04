import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import connectToDatabase from '@/lib/mongodb';
import { GalleryImage } from '@/models/GalleryImage';
import { verifyAuth } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch all items from MongoDB, sorted newest first
    const images = await GalleryImage.find({}).sort({ createdAt: -1 });
    
    // Convert _id to id for frontend compatibility
    const formattedImages = images.map(img => ({
      id: img._id.toString(),
      title: img.title,
      category: img.category,
      url: img.url,
      description: img.description,
      createdAt: img.createdAt
    }));
    
    return NextResponse.json(formattedImages);
  } catch (error) {
    console.error("GET Gallery Error:", error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // SECURITY: Verify JWT Auth Token
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const category = formData.get('category') as string || 'Editorial';
    const description = formData.get('description') as string || '';
    const file = formData.get('file') as File | null;
    const existingUrl = formData.get('url') as string | null; // From client upload

    if (!title || (!file && !existingUrl)) {
      return NextResponse.json({ error: 'Title and file/url are required' }, { status: 400 });
    }

    let fileUrl = existingUrl || "";

    // If file is provided (server-side upload fallback)
    if (!existingUrl && file) {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const blob = await put(`images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`, file, { access: 'public' });
        fileUrl = blob.url;
      } else {
        // Local fallback (no Vercel Blob token)
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        fileUrl = `/uploads/${filename}`;
      }
    }

    await connectToDatabase();
    
    // Save metadata to MongoDB
    const newItem = await GalleryImage.create({
      title,
      category,
      description,
      url: fileUrl,
    });

    const formattedItem = {
      id: newItem._id.toString(),
      title: newItem.title,
      category: newItem.category,
      description: newItem.description,
      url: newItem.url,
      createdAt: newItem.createdAt
    };

    return NextResponse.json({ success: true, item: formattedItem }, { status: 201 });
  } catch (error: any) {
    console.error("POST Gallery Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to save data' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // SECURITY: Verify JWT Auth Token
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const url = searchParams.get('url');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    // 1. Delete physical file from Vercel Blob (or local)
    if (url) {
      if (process.env.BLOB_READ_WRITE_TOKEN && url.includes('public.blob.vercel-storage.com')) {
        try {
          await del(url);
        } catch (delError) {
          console.warn("Failed to delete blob from Vercel:", delError);
        }
      } else if (url.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', url);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fsError) {
            console.warn("Failed to delete local file:", fsError);
          }
        }
      }
    }

    // 2. Delete metadata from MongoDB
    await connectToDatabase();
    await GalleryImage.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Gallery Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
