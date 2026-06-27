import { GetPresignedUrlParams } from "../types";

const getPresignedUrl = async (params: GetPresignedUrlParams) => {
  const res = await fetch("/api/upload/presigned-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");

    throw new Error(
      `Failed to get presigned URL (${res.status})${body ? `: ${body}` : ""}`,
    );
  }

  const data = await res.json();

  return data as {
    key: string;
    signedUrl: string;
  };
}

const uploadFile = async (file: File, folder: string) => {
  const presigned = await getPresignedUrl({
    fileName: file.name,
    contentType: file.type,
    folder,
  });

  const uploadRes = await fetch(presigned.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadRes.ok) {
    console.error(uploadRes);
    throw new Error("Upload failed", {
      cause: uploadRes,
    });
  }

  return {
    key: presigned.key,
  };
}

export {
  getPresignedUrl,
  uploadFile,
}