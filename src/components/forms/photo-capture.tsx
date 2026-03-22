'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoCaptureProps {
  value?: string;
  onChange: (value: string | null) => void;
  label?: string;
}

export function PhotoCapture({ value, onChange, label }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string);
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Captured photo"
            className="max-h-48 rounded-lg border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Camera className="h-4 w-4 mr-2" />
            Take photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      )}

      {/* Camera capture (mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      {/* File picker (any device) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
