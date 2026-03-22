'use client';

import { useRef, useEffect, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange: (value: string | null) => void;
  label?: string;
}

export function SignaturePadComponent({ value, onChange, label }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(ratio, ratio);

    const sp = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });
    spRef.current = sp;

    if (value) sp.fromDataURL(value);

    const handleEndStroke = () => {
      onChange(sp.isEmpty() ? null : sp.toDataURL());
    };
    sp.addEventListener('endStroke', handleEndStroke);

    return () => {
      sp.removeEventListener('endStroke', handleEndStroke);
      sp.off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClear = useCallback(() => {
    spRef.current?.clear();
    onChange(null);
  }, [onChange]);

  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          style={{ height: 160 }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClear}
        className="h-9"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
        Clear
      </Button>
      {value && (
        <p className="text-xs text-green-600 font-medium">Signature captured</p>
      )}
    </div>
  );
}
