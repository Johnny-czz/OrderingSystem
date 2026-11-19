import { isCloudEnabled, uploadDishImage } from "./cloudbase";

/** 把图片压缩成 dataURL（本机演示模式下的降级方案） */
export function compressImage(file: File, maxSize = 640, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("解析图片失败"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("无法处理图片"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  if (isCloudEnabled()) {
    try {
      return await uploadDishImage(file);
    } catch (error) {
      console.error("云存储上传失败，回退为本地压缩图", error);
    }
  }
  return compressImage(file);
}
