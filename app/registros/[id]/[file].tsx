import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { publicUrl } from '../../../src/lib/api';
import { s } from '../../../src/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../../src/components/Card';
import { colors } from '../../../src/lib/designSystem';

export default function RegistroStorageRedirect() {
  const { id, file } = useLocalSearchParams<{ id?: string; file?: string }>();
  const [message, setMessage] = useState('Abriendo documento…');

  useEffect(() => {
    (async () => {
      try {
        const registroId = Array.isArray(id) ? id[0] : id;
        const fileName = Array.isArray(file) ? file[0] : file;

        if (!registroId || !fileName) {
          setMessage('No encontramos el documento solicitado.');
          return;
        }

        const signedUrl = await publicUrl('documentos', `registros/${registroId}/${fileName}`);
        if (typeof window !== 'undefined') {
          window.location.replace(signedUrl);
          return;
        }

        await Linking.openURL(signedUrl);
        setMessage('Si no se abrió automáticamente, volvé a Mis documentos y tocá Ver archivo.');
      } catch (e: any) {
        setMessage(e?.message ?? 'No se pudo abrir el documento.');
      }
    })();
  }, [id, file]);

  return (
    <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', paddingBottom: 120 }]}> 
      <Card style={{ width: '100%', maxWidth: 420, alignItems: 'center', paddingVertical: 36 }}>
        <Ionicons name="document-text-outline" size={44} color={colors.primary[500]} />
        <ActivityIndicator color={colors.primary[600]} style={{ marginTop: 18 }} />
        <Text style={[s.text, { marginTop: 12, textAlign: 'center' }]}>{message}</Text>
      </Card>
    </View>
  );
}
