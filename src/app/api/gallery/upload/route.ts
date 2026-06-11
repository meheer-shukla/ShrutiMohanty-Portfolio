import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // SECURITY: Verify JWT Auth Token before allowing uploads
    const isAuthenticated = await verifyAuth();
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as HandleUploadBody;
    
    // Safety check - if no token is configured, this will fail immediately
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "No blob token" }, { status: 400 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Client upload completed successfully", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload handler failed';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
