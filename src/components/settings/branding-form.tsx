'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateBranding, uploadLogo } from '@/actions/settings';
import { toast } from 'sonner';
import { Upload, Palette } from 'lucide-react';

type Branding = {
  primaryColor: string;
  logoUrl?: string;
  companyName: string;
};

interface BrandingFormProps {
  branding: Branding;
}

export function BrandingForm({ branding }: BrandingFormProps) {
  const [color, setColor] = useState(branding.primaryColor);
  const [hexInput, setHexInput] = useState(branding.primaryColor);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? '');
  const [savingColor, setSavingColor] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleColorChange(val: string) {
    setColor(val);
    setHexInput(val);
  }

  function handleHexInput(val: string) {
    setHexInput(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val);
    }
  }

  async function handleSaveColor() {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      toast.error('Please enter a valid hex colour (e.g. #2563eb)');
      return;
    }
    setSavingColor(true);
    const result = await updateBranding({ primaryColor: color });
    setSavingColor(false);
    if (result.success) {
      toast.success('Brand colour saved — refresh to see it applied');
    } else {
      toast.error(result.error ?? 'Failed to save colour');
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    const result = await uploadLogo(formData);
    setUploadingLogo(false);

    if (result.success && result.logoUrl) {
      setLogoUrl(result.logoUrl);
      toast.success('Logo uploaded');
    } else {
      toast.error(result.error ?? 'Failed to upload logo');
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-8 max-w-lg">
      {/* Logo */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Company logo</Label>
        {logoUrl && (
          <div className="w-32 h-16 border border-border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
            <img src={logoUrl} alt="Company logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
            className="h-12 gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
          <p className="text-xs text-muted-foreground">PNG, JPG, SVG · max 2MB</p>
        </div>
      </div>

      {/* Primary colour */}
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Brand colour
        </Label>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg border border-border cursor-pointer p-1"
            />
          </div>
          <Input
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#2563eb"
            className="w-32 font-mono text-sm"
            maxLength={7}
          />
          {/* Live swatch */}
          <div
            className="w-12 h-12 rounded-lg border border-border shrink-0"
            style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#e5e7eb' }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Applied to email templates, PDFs, calendar highlights, and the customer portal.
        </p>
        <Button
          type="button"
          onClick={handleSaveColor}
          disabled={savingColor}
          className="h-12"
        >
          {savingColor ? 'Saving…' : 'Save colour'}
        </Button>
      </div>
    </div>
  );
}
