export async function convertToWebP(
  file: File,
  quality: number = 0.82
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const maxWidth = 1920;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        const webpFile = new File(
          [blob!],
          file.name.replace(/\.[^.]+$/, '.webp'),
          { type: 'image/webp' }
        );
        resolve(webpFile);
      }, 'image/webp', quality);
    };

    img.src = url;
  });
}

export async function convertMultipleToWebP(
  files: FileList | File[],
  quality: number = 0.82,
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const fileArray = Array.from(files);
  const converted: File[] = [];

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];
    if (file.type.startsWith('image/')) {
      converted.push(await convertToWebP(file, quality));
    } else {
      converted.push(file);
    }
    onProgress?.(i + 1, fileArray.length);
  }

  return converted;
}
