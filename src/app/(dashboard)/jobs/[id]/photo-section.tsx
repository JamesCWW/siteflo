'use client';

import { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addJobPhoto, deleteJobPhoto } from '@/actions/jobs';
import { createClient } from '@/lib/supabase/client';
import { Camera, Upload, Trash2, Image, Loader2 } from 'lucide-react';

interface Photo {
  id: string;
  storageUrl: string;
  caption: string | null;
  takenAt: Date;
}

interface PhotoSectionProps {
  jobId: string;
  photos: Photo[];
  canAdd: boolean;
}

export function PhotoSection({ jobId, photos: initialPhotos, canAdd }: PhotoSectionProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/jobs/${jobId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('job-photos')
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-photos')
        .getPublicUrl(path);

      const result = await addJobPhoto(jobId, publicUrl);
      if (result.success && result.data) {
        setPhotos((prev) => [...prev, result.data as Photo]);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      setError('Failed to upload photo. Make sure the job-photos bucket exists in Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadPhoto(file);
    e.target.value = '';
  };

  const handleDelete = async (photoId: string) => {
    const result = await deleteJobPhoto(photoId, jobId);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base">Photos</CardTitle>
        {canAdd && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => cameraRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}

        {photos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Image className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No photos attached</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.storageUrl}
                  alt={photo.caption ?? 'Job photo'}
                  className="w-full h-full object-cover"
                />
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute top-1 right-1 bg-destructive/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}
