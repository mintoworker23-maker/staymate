type CloudinaryUploadResult = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

type UploadErrorCode =
  | 'cloudinary/missing-config'
  | 'cloudinary/upload-failed'
  | 'cloudinary/invalid-response';

class UploadError extends Error {
  code: UploadErrorCode;
  status?: number;

  constructor(code: UploadErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ?? '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim() ?? '';
const CLOUDINARY_UPLOAD_FOLDER =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_FOLDER?.trim() ?? '';

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getCloudinaryUploadUrl() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new UploadError(
      'cloudinary/missing-config',
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.'
    );
  }

  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
}

export async function uploadProfileImages(uid: string, imageUris: string[]): Promise<string[]> {
  const uploadUrl = getCloudinaryUploadUrl();
  const uploadedUrls: string[] = [];

  for (let index = 0; index < imageUris.length; index += 1) {
    const imageUri = imageUris[index];
    if (!imageUri) {
      throw new UploadError('cloudinary/upload-failed', 'Selected image is invalid.');
    }
    const filename = `${Date.now()}-${index}.jpg`;

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const formData = new FormData();
        // React Native FormData expects URI-based file objects for binary uploads.
        formData.append('file', {
          uri: imageUri,
          name: filename,
          type: 'image/jpeg',
        } as unknown as Blob);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        if (CLOUDINARY_UPLOAD_FOLDER) {
          formData.append('folder', `${CLOUDINARY_UPLOAD_FOLDER}/${uid}`);
        }

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        const parsed = (await response.json().catch(() => null)) as CloudinaryUploadResult | null;
        if (!response.ok) {
          const message =
            parsed?.error?.message ??
            `Cloudinary upload failed with status ${response.status}.`;
          throw new UploadError('cloudinary/upload-failed', message, response.status);
        }

        if (!parsed?.secure_url) {
          throw new UploadError(
            'cloudinary/invalid-response',
            'Cloudinary upload succeeded but no image URL was returned.'
          );
        }

        uploadedUrls.push(parsed.secure_url);
        lastError = null;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error.';
        const normalized = error instanceof UploadError
          ? error
          : new UploadError(
              'cloudinary/upload-failed',
              `Network request to Cloudinary failed. ${message}`
            );

        lastError = normalized;
        if (attempt < 1) {
          await sleep(500);
          continue;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return uploadedUrls;
}
