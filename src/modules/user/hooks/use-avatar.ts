"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
} from "react";

import { getPublicObjectUrl } from "@/lib/storage-url";
import { compressImage, useUploadFile } from "@/modules/upload";

const useAvatar = () => {
  const fileInputId = useId();
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const uploadMutation = useUploadFile();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const replacePreviewUrl = useCallback((nextPreviewUrl: string | null) => {
    setPreviewUrl(nextPreviewUrl);
  }, []);

  const resetFileInput = useCallback(() => {
    setFileInputKey((key) => key + 1);
  }, []);

  const openFilePicker = useCallback(() => {
    const fileInput = document.getElementById(fileInputId);
    fileInput?.click();
  }, [fileInputId]);

  const clearPreview = useCallback(() => {
    replacePreviewUrl(null);
    resetFileInput();
  }, [replacePreviewUrl, resetFileInput]);

  const clearUploadError = useCallback(() => {
    setImageUploadError(null);
    uploadMutation.reset();
  }, [uploadMutation]);

  const uploadAvatarToTemp = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return null;

    clearUploadError();
    setIsImageProcessing(true);

    try {
      const compressedFile = await compressImage(file);
      const nextPreviewUrl = URL.createObjectURL(compressedFile);

      replacePreviewUrl(nextPreviewUrl);

      const uploaded = await uploadMutation.mutateAsync({
        file: compressedFile,
        folder: "temp/avatar",
      });

      return uploaded.key;
    } catch (error) {
      clearPreview();
      setImageUploadError(
        error instanceof Error ? error.message : "Image upload failed",
      );
      return null;
    } finally {
      setIsImageProcessing(false);
    }
  };

  const getAvatarSrc = (image?: string | null) => {
    return previewUrl ?? getPublicObjectUrl(image ?? "");
  };

  return {
    fileInputId,
    fileInputKey,
    previewUrl,
    imageUploadError,
    isImageProcessing,
    uploadMutation,
    openFilePicker,
    clearPreview,
    clearUploadError,
    uploadAvatarToTemp,
    getAvatarSrc,
  };
};

export { useAvatar };
