import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import connectToDatabase from '@/lib/mongodb';
import { GalleryImage } from '@/models/GalleryImage';
import { verifyAuth } from '@/lib/auth';
import { validateCsrf } from '@/lib/csrf';
import { ALLOWED_CATEGORIES } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/** Maximum lengths for input validation */
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

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
    
    const response = NextResponse.json(formattedImages);
    // Cache for 60s, serve stale while revalidating for up to 120s
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    console.error("GET Gallery Error:", error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // CSRF validation
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

    // SECURITY: Verify JWT Auth Token
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = (formData.get('title') as string || '').trim();
    const category = (formData.get('category') as string || 'Editorial').trim();
    const description = (formData.get('description') as string || '').trim();
    const file = formData.get('file') as File | null;
    const existingUrl = formData.get('url') as string | null; // From client upload

    // --- Input Validation ---
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.includes(category as typeof ALLOWED_CATEGORIES[number])) {
      return NextResponse.json({ error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}` }, { status: 400 });
    }
    if (!file && !existingUrl) {
      return NextResponse.json({ error: 'An image file or URL is required' }, { status: 400 });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save data';
    console.error("POST Gallery Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    // CSRF validation
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete';
    console.error("DELETE Gallery Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
