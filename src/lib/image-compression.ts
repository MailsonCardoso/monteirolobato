/**
 * Comprime e redimensiona uma imagem no navegador antes do upload.
 * Reduz fotos de celulares (5MB-15MB) para ~60-120KB mantendo ótima nitidez para visualização.
 */
export async function comprimirImagem(
  file: File,
  maxDimension = 700,
  quality = 0.82,
): Promise<{ file: File; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    // Se não for imagem, retorna o arquivo original
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem válida."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler arquivo de imagem."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Erro ao processar imagem."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Mantém a proporção limitando à dimensão máxima
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar o contexto 2D."));
          return;
        }

        // Desenha imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao converter canvas para blob."));
              return;
            }
            const nomeBase = file.name.replace(/\.[^/.]+$/, "");
            const novoArquivo = new File([blob], `${nomeBase}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve({ file: novoArquivo, dataUrl });
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

