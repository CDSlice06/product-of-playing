export async function removeBackground(src: string, tolerance: number = 40): Promise<string> {
  if (src.startsWith('data:image/svg+xml')) return src; // Don't process SVGs

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Find background color from top-left pixel
        const bgR = data[0], bgG = data[1], bgB = data[2];
        const visited = new Uint8Array(width * height);
        
        // Start from 4 corners to flood fill
        const stack = [0, width - 1, (height - 1) * width, height * width - 1];
        for (const idx of stack) visited[idx] = 1;
        
        while (stack.length > 0) {
          const idx = stack.pop()!;
          const x = idx % width;
          const y = Math.floor(idx / width);
          const pIdx = idx * 4;
          
          const r = data[pIdx];
          const g = data[pIdx + 1];
          const b = data[pIdx + 2];
          const a = data[pIdx + 3];
          
          if (a > 0 && Math.abs(r - bgR) <= tolerance && Math.abs(g - bgG) <= tolerance && Math.abs(b - bgB) <= tolerance) {
            data[pIdx + 3] = 0; // Make transparent
            
            if (x > 0 && !visited[idx - 1]) { visited[idx - 1] = 1; stack.push(idx - 1); }
            if (x < width - 1 && !visited[idx + 1]) { visited[idx + 1] = 1; stack.push(idx + 1); }
            if (y > 0 && !visited[idx - width]) { visited[idx - width] = 1; stack.push(idx - width); }
            if (y < height - 1 && !visited[idx + width]) { visited[idx + width] = 1; stack.push(idx + width); }
          }
        }
        
        // Crop the image to non-transparent bounds
        let minX = width, minY = height, maxX = 0, maxY = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        if (maxX >= minX && maxY >= minY) {
          const croppedWidth = maxX - minX + 1;
          const croppedHeight = maxY - minY + 1;
          const croppedCanvas = document.createElement("canvas");
          croppedCanvas.width = croppedWidth;
          croppedCanvas.height = croppedHeight;
          const croppedCtx = croppedCanvas.getContext("2d");
          if (croppedCtx) {
            croppedCtx.putImageData(ctx.getImageData(minX, minY, croppedWidth, croppedHeight), 0, 0);
            return resolve(croppedCanvas.toDataURL("image/png"));
          }
        }
        
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
