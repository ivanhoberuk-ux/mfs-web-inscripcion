/// <reference lib="dom" />

// FILE: src/components/SignaturePad.web.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { colors, radius, shadows } from '../lib/designSystem';
// @ts-ignore - No hay tipos para react-signature-canvas
import SignatureCanvas from 'react-signature-canvas';

export type SignaturePadHandle = {
  clear: () => void;
  getDataURL: () => Promise<string>;
};

type Props = {
  height?: number;
};

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ height = 220 }, ref) => {
  const sigRef = useRef<SignatureCanvas | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigRef.current?.clear();
    },
    getDataURL: async () => {
      const canvas = sigRef.current?.getTrimmedCanvas();
      if (!canvas) throw new Error('No hay firma');
      return canvas.toDataURL('image/png');
    },
  }));

  return (
    <View style={{ height, borderWidth: 2, borderColor: colors.primary[100], backgroundColor: colors.surface.light, borderRadius: radius.lg, overflow: 'hidden', ...shadows.sm }}>
      <SignatureCanvas
        ref={sigRef as any}
        backgroundColor={colors.surface.light}
        penColor={colors.text.primary.light}
        canvasProps={{ style: { width: '100%', height: '100%' } as any }}
      />
    </View>
  );
});

export default SignaturePad;
