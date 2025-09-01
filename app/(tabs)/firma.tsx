import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import Signature from 'react-native-signature-canvas';
import { s } from '../../src/lib/theme';
import { generarAutorizacionPDF } from '../../src/lib/pdf';
import { uploadToStorage, updateDocumento } from '../../src/lib/api';

export default function Firma() {
  const [sig, setSig] = useState<string | null>(null);
  const ref = useRef<any>();

  const handleOK = (signature: string) => setSig(signature); // dataURL base64
  const handleClear = () => setSig(null);

  async function guardarPDF() {
    if (!sig) return Alert.alert('Falta la firma');
    const pdf = await generarAutorizacionPDF({
      nombres: 'Juan', apellidos: 'Pérez', ci: '1234567', nacimiento: '2001-01-01',
      email: 'juan@test.com', telefono: '0981 123 456', direccion: 'Asunción',
      puebloNombre: 'Pueblo 1', rol: 'Misionero', esJefe: false
    }, sig);
    const url = await uploadToStorage('documentos', `autorizaciones/firmada-${Date.now()}.pdf`, pdf);
    if (url) await updateDocumento('demo-1', { autorizacion_url: url, firma_url: sig });
    Alert.alert('Listo', 'PDF generado y subido.');
  }

  return (
    <View style={s.screen}>
      <Text style={s.title}>Firma digital</Text>
      <View style={[s.card, { height: 260 }]}>
        <Signature
          ref={ref}
          onOK={handleOK}
          onEmpty={()=>{}}
          descriptionText="Firmá aquí"
          clearText="Borrar"
          confirmText="Usar firma"
          webStyle=".m-signature-pad--footer {display:flex; gap:12px;}"
        />
      </View>
      <Pressable style={s.button} onPress={guardarPDF}><Text style={s.buttonText}>Generar PDF con firma</Text></Pressable>
      <Pressable style={[s.button, s.danger]} onPress={handleClear}><Text style={s.buttonText}>Borrar firma</Text></Pressable>
    </View>
  );
}
