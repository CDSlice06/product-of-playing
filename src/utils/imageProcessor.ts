const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export async function removeWhiteBackground(src: string): Promise<string> {
  if (src.startsWith('data:image/svg')) return src;
  if (cache.has(src)) return cache.get(src)!;
  if (pending.has(src)) return pending.get(src)!;

  const promise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const visited = new Uint8Array(width * height);
        const stack = [];

        // 容差判断：RGB 都大于 230 视为白色背景
        const isWhite = (r: number, g: number, b: number) => r > 230 && g > 230 && b > 230;

        // 从四个角开始泛洪
        const corners = [0, width - 1, (height - 1) * width, height * width - 1];
        for (const idx of corners) {
          const pIdx = idx * 4;
          if (isWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
            stack.push(idx);
            visited[idx] = 1;
          }
        }

        while (stack.length > 0) {
          const idx = stack.pop()!;
          const x = idx % width;
          const y = Math.floor(idx / width);
          const pIdx = idx * 4;

          if (isWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
            data[pIdx + 3] = 0; // 设为透明

            const neighbors = [
              x > 0 ? idx - 1 : -1,
              x < width - 1 ? idx + 1 : -1,
              y > 0 ? idx - width : -1,
              y < height - 1 ? idx + width : -1
            ];

            for (const n of neighbors) {
              if (n !== -1 && visited[n] === 0) {
                visited[n] = 1;
                stack.push(n);
              }
            }
          }
        }

        // 裁剪掉周围的透明像素
        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // 如果找到了非透明区域，截取该区域
        if (maxX >= minX && maxY >= minY) {
           const cropW = maxX - minX + 1;
           const cropH = maxY - minY + 1;
           const cropCanvas = document.createElement('canvas');
           cropCanvas.width = cropW;
           cropCanvas.height = cropH;
           const cropCtx = cropCanvas.getContext('2d');
           if (cropCtx) {
               cropCtx.putImageData(ctx.getImageData(minX, minY, cropW, cropH), 0, 0);
               const result = cropCanvas.toDataURL('image/png');
               cache.set(src, result);
               return resolve(result);
           }
        }

        const result = canvas.toDataURL('image/png');
        cache.set(src, result);
        resolve(result);
      } catch (e) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  pending.set(src, promise);
  promise.finally(() => pending.delete(src));
  return promise;
}