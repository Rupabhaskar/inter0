import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "college-logos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const collegeId = formData.get("collegeId") || ""; // optional: for overwrite

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No file or invalid file provided." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB." },
        { status: 400 }
      );
    }

    const type = file.type?.toLowerCase() || "";
    if (!ALLOWED_TYPES.some((t) => type.includes(t))) {
      return NextResponse.json(
        { error: "Invalid type. Use JPEG, PNG, WebP or GIF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name || "img").split(".").pop() || "png";
    const publicId = collegeId
      ? `${FOLDER}/${collegeId}`
      : `${FOLDER}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: FOLDER,
            public_id: publicId.split("/").pop(),
            resource_type: "image",
            overwrite: true,
          },
          (err, res) => {
            if (err) reject(err);
            else resolve(res);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (err) {
    console.error("Upload college logo error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed." },
      { status: 500 }
    );
  }
}
