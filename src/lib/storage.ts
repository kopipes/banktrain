import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const STORAGE_BACKEND = process.env.STORAGE_BACKEND ?? "local"; // "local" | "r2"
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/** Ensure local upload directory exists */
async function ensureLocalDir() {
  if (!existsSync(LOCAL_UPLOAD_DIR)) {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Save an image buffer/base64 and return { key, url }
 */
export async function saveImage(
  data: Buffer | string,
  filename: string
): Promise<{ key: string; url: string }> {
  if (STORAGE_BACKEND === "r2") {
    return saveToR2(data, filename);
  }
  return saveToLocal(data, filename);
}

async function saveToLocal(
  data: Buffer | string,
  filename: string
): Promise<{ key: string; url: string }> {
  await ensureLocalDir();
  // Guard against path traversal — resolved path must stay within LOCAL_UPLOAD_DIR
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, path.basename(filename));
  if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep) && resolved !== LOCAL_UPLOAD_DIR) {
    throw new Error("Invalid filename: path traversal detected");
  }
  const buf =
    typeof data === "string"
      ? Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), "base64")
      : data;
  const key = `uploads/${path.basename(filename)}`;
  await fs.writeFile(resolved, buf);
  return { key, url: `/${key}` };
}

async function saveToR2(
  data: Buffer | string,
  filename: string
): Promise<{ key: string; url: string }> {
  // Lazy import — only used when STORAGE_BACKEND=r2
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const buf =
    typeof data === "string"
      ? Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), "base64")
      : data;
  const key = `uploads/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buf,
      ContentType: "image/png",
    })
  );
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  return { key, url: publicUrl };
}

/** Delete an image by key */
export async function deleteImage(key: string): Promise<void> {
  if (STORAGE_BACKEND === "r2") {
    const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } else {
    // Guard against path traversal
    const resolved = path.resolve(LOCAL_UPLOAD_DIR, path.basename(key));
    if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep)) {
      throw new Error("Invalid key: path traversal detected");
    }
    try {
      await fs.unlink(resolved);
    } catch {
      // ignore missing file
    }
  }
}
