import { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  label: string;
  description: string;
  onFile: (buffer: ArrayBuffer) => void;
  accepted?: string;
}

export function FileUpload({ label, description, onFile, accepted = '.xlsx,.xls' }: FileUploadProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }, [onFile]);

  return (
    <label className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-card p-6 transition-all hover:border-primary/40 hover:bg-primary/5">
      <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
        <Upload className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground text-center">{description}</p>
      <input type="file" accept={accepted} onChange={handleChange} className="hidden" />
    </label>
  );
}
