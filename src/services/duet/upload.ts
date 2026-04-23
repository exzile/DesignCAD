export function uploadViaXhr(
  method: 'PUT' | 'POST',
  url: string,
  content: Blob | File,
  onProgress?: (percent: number) => void,
  validateResponse?: (responseText: string) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const detail = xhr.responseText?.trim();
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}${detail ? ` - ${detail}` : ''}`));
        return;
      }

      try {
        validateResponse?.(xhr.responseText);
        resolve();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.onabort = () => reject(new Error('Upload canceled'));
    xhr.send(content);
  });
}
