import { useRef } from 'react';
import type { FamilyImage } from '@/types/sales';
import { ImagePlus } from 'lucide-react';

interface FamilyImageManagerProps {
  families: string[];
  images: FamilyImage;
  onImageSet: (family: string, dataUrl: string) => void;
}

export function FamilyImageManager({ families, images, onImageSet }: FamilyImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentFamily = useRef('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImageSet(currentFamily.current, reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const triggerUpload = (family: string) => {
    currentFamily.current = family;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Imagens por Família</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {families.map(f => (
          <button
            key={f}
            onClick={() => triggerUpload(f)}
            className="flex flex-col items-center gap-1 rounded-lg border bg-card p-2 transition-colors hover:border-primary/40"
          >
            {images[f] ? (
              <img src={images[f]} alt={f} className="h-10 w-10 rounded object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <span className="text-[10px] font-medium text-muted-foreground">{f}</span>
          </button>
        ))}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
