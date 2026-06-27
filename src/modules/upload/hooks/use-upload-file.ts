import { useMutation } from "@tanstack/react-query";
import { uploadFile } from "../services/upload.service";
import { toast } from "sonner";

const useUploadFile = () => {
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder: string }) =>
      uploadFile(file, folder),
    onError: () => {
      toast.error("Failed to upload file");
    }
  });
}

export { useUploadFile };