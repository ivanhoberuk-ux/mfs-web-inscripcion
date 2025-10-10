// FILE: src/components/SignaturePad.native.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import Signature from 'react-native-signature-canvas';

export type SignaturePadHandle = {
  clear: () => void;
  getDataURL: () => Promise<string>;
};

type Props = {
  height?: number;
};

const SignaturePad = forwardRef<SignaturePadHandle, Props>(({ height = 220 }, ref) => {
  const sigRef = useRef<any>(null);
  const [resolver, setResolver] = useState<((v: string)=>void) | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => {
      sigRef.current?.clearSignature();
    },
    getDataURL: async () => {
      return new Promise<string>((resolve, reject) => {
        setResolver(() => resolve);
        try {
          sigRef.current?.readSignature(); // dispara onOK
        } catch (e) {
          reject(e);
        }
        setTimeout(() => reject(new Error('No se pudo leer la firma')), 4000);
      });
    },
  }));

  return (
    <View style={{ height, borderWidth: 1, borderColor: '#999', borderRadius: 8, overflow: 'hidden' }}>
      <Signature
        ref={sigRef}
        onOK={(data: string) => {
          resolver?.(data);
          setResolver(null);
        }}
        onEmpty={() => {}}
        descriptionText="Firme aquí"
        webStyle=".m-signature-pad--footer {display:none;} .m-signature-pad--body {border:none;}"
        backgroundColor="#fff"
        penColor="#111"
        autoClear={false}
      />
    </View>
  );
});

export default SignaturePad;
