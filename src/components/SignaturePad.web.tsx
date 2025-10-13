/// <reference lib="dom" />

// FILE: src/components/SignaturePad.web.tsx
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
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
    <View style={{ height, borderWidth: 1, borderColor: '#999', borderRadius: 8, overflow: 'hidden' }}>
      <SignatureCanvas
        ref={sigRef as any}
        backgroundColor="#fff"
        penColor="#111"
        canvasProps={{ style: { width: '100%', height: '100%' } as any }}
      />
    </View>
  );
});

export default SignaturePad;
