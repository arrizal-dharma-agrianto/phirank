import { S3Client } from "@aws-sdk/client-s3";
import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT is not set");
}
const S3_ENDPOINT = process.env.S3_ENDPOINT;

if (!process.env.S3_ACCESS_KEY_ID) {
  throw new Error("S3_ACCESS_KEY_ID is not set");
}
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;

if (!process.env.S3_SECRET_ACCESS_KEY) {
  throw new Error("S3_SECRET_ACCESS_KEY is not set");
}
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

if (!process.env.S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME is not set");
}
const bucketName = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID!,
    secretAccessKey: S3_SECRET_ACCESS_KEY!,
  },
});

const copyObject = async (params: {
  fromKey: string;
  toKey: string;
}) => {
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${params.fromKey}`,
      Key: params.toKey,
    }),
  );

  return params.toKey;
};

const moveObject = async (params: {
  fromKey: string;
  toKey: string;
}) => {
  await copyObject(params);

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: params.fromKey,
      }),
    );
  } catch (error) {
    await rollbackCopiedObject(params.toKey, error);

    throw error;
  }

  return params.toKey;
};

const rollbackCopiedObject = async (key: string, cause: unknown) => {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );

      return;
    } catch (rollbackError) {
      console.error("Failed to rollback copied object", {
        attempt,
        cause,
        key,
        rollbackError,
      });
    }
  }
};

const deleteObject = async (key?: string | null) => {
  if (!key) return;

  if (key.startsWith("http")) return;

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      }),
    );
  } catch (error) {
    console.error(`Failed to delete object ${key}:`, error);
    throw error;
  }
};

export { s3Client, bucketName, copyObject, moveObject, deleteObject };
