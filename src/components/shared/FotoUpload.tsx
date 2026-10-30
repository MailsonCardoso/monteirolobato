import { useState, useRef } from "react";
import { Camera, Trash2, Loader2, User } from "lucide-react";
import { comprimirImagem } from "@/lib/image-compression";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FotoUploadProps {
  value?: string | null;
  onChange: (file: File | null, previewUrl: string | null) => void;
  disabled?: boolean;
  nome?: string;
  className?: string;
  size?: "md" | "lg";
}

export function FotoUpload({
  value,
  onChange,
  disabled = false,
  nome = "",
  className,
  size = "lg",
}: FotoUploadProps) {
  const [compressing, setCompressing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const iniciais = nome
    ? nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset do input para permitir selecionar o mesmo arquivo se quiser
    e.target.value = "";

    try {
      setCompressing(true);
      const toastId = toast.loading("Otimizando foto...");
      const { file: compressedFile, dataUrl } = await comprimirImagem(file, 700, 0.82);
      toast.dismiss(toastId);
      toast.success("Foto selecionada e comprimida com sucesso!");
      onChange(compressedFile, dataUrl);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao processar imagem";
      toast.error(errorMsg);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemover = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    toast.info("Foto removida");
  };

  const sizeClasses = {
    md: "size-20 text-lg",
    lg: "size-28 text-2xl",
  }[size];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative group">
        <button
          type="button"
          onClick={() => !disabled && !compressing && inputRef.current?.click()}
          disabled={disabled || compressing}
          aria-label="Selecionar foto do aluno"
          className={cn(
            "relative rounded-full overflow-hidden border-2 border-border shadow-sm bg-muted/40 grid place-items-center transition-all",
            sizeClasses,
            !disabled && "hover:border-primary cursor-pointer group-hover:shadow-md",
            disabled && "opacity-80 cursor-default",
          )}
        >
          {compressing ? (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1 z-20">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Comprimindo...</span>
            </div>
          ) : value ? (
            <img
              src={value}
              alt={nome || "Foto do aluno"}
              className="size-full object-cover"
              onError={(e) => {
                // Se a imagem falhar ao carregar, esconde
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          ) : iniciais ? (
            <span className="font-bold text-primary select-none">{iniciais}</span>
          ) : (
            <User className="size-1/2 text-muted-foreground/60" />
          )}

          {/* Overlay de hover para trocar foto */}
          {!disabled && !compressing && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="size-6 drop-shadow" />
            </div>
          )}
        </button>

        {/* Botão de câmera no canto inferior direito */}
        {!disabled && !compressing && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-transform active:scale-90"
            title="Alterar foto"
          >
            <Camera className="size-3.5" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || compressing}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {value ? "Clique para trocar a foto" : "Adicionar foto do aluno"}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleRemover}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="size-3" /> Remover
          </button>
        )}
      </div>
    </div>
  );
}

export function AlunoAvatar({
  foto,
  nome,
  className,
  size = "md",
}: {
  foto?: string | null;
  nome: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const iniciais = nome
    ? nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("")
    : "";

  const sizeClasses = {
    sm: "size-8 text-xs",
    md: "size-11 text-sm",
    lg: "size-16 text-xl",
    xl: "size-24 text-3xl",
  }[size];

  if (foto) {
    return (
      <div
        className={cn(
          "rounded-full overflow-hidden border border-border bg-muted/30 shrink-0 shadow-sm",
          sizeClasses,
          className,
        )}
      >
        <img
          src={foto}
          alt={nome}
          className="size-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full border border-primary/20 bg-primary/10 text-primary font-bold grid place-items-center shrink-0 select-none shadow-sm",
        sizeClasses,
        className,
      )}
    >
      {iniciais || <User className="size-1/2 opacity-70" />}
    </div>
  );
}

