import { api } from './api';
import type { MediaAsset, MediaType } from '@/types/models';

export async function uploadToCloudinary(input: {
  file: File | Blob;
  type: MediaType;
  waveform?: number[];
  duration?: number;
  onProgress?: (pct: number) => void;
}): Promise<MediaAsset> {
  const sig = await api.media.sign(input.type);

  const form = new FormData();
  form.append('file', input.file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);

  const cloudResp = await uploadXHR(sig.uploadUrl, form, input.onProgress);

  const asset = await api.media.register({
    type: input.type,
    publicId: cloudResp.public_id,
    url: cloudResp.secure_url,
    width: cloudResp.width,
    height: cloudResp.height,
    duration: input.duration ?? cloudResp.duration,
    format: cloudResp.format,
    bytes: cloudResp.bytes,
    waveform: input.waveform,
  });

  return asset;
}

interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  bytes?: number;
}

function uploadXHR(
  url: string,
  form: FormData,
  onProgress?: (pct: number) => void,
): Promise<CloudinaryResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryResponse);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}
