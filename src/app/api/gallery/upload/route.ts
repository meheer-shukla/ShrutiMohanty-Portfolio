import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    
    // Safety check - if no token is configured, this will fail immediately
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "No blob token" }, { status: 400 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Client upload completed successfully", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload handler failed" },
      { status: 400 }
    );
  }
}
