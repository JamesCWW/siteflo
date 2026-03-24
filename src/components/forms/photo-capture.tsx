'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PhotoCaptureProps {
  value?: string;
  onChange: (value: string | null) => void;
  label?: string;
  jobId?: string;
  fieldId?: string;
}

export function PhotoCapture({ value, onChange, label, jobId, fieldId }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsProcessing(true);
    setUploadError(null);

    // If jobId is provided, upload to Supabase storage
    if (jobId) {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${user.id}/jobs/${jobId}/fields/${fieldId ?? 'photo'}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('service-photos')
          .upload(path, file, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('service-photos')
          .getPublicUrl(path);

        onChange(publicUrl);
      } catch (err) {
        console.error('Photo upload failed:', err);
        setUploadError('Upload failed — check the service-photos bucket exists in Supabase');
        // Fall back to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          onChange(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // No jobId — store as base64
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
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Uploading…' : 'Take photo'}
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
      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
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
