import { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { supabase } from '../../src/integrations/supabase/client';
import { PageHeader } from '../../src/components/PageHeader';
import { s, colors, radius, spacing, typography } from '../../src/lib/theme';

export default function TestEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const sendTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { email: 'ivanhoberuk@gmail.com' }
      });

      if (error) {
        throw error;
      }

      setResult(`✅ Email enviado exitosamente a ivanhoberuk@gmail.com`);
      Alert.alert('Éxito', 'Email de prueba enviado. Revisa tu bandeja de entrada.');
    } catch (error: any) {
      console.error('Error:', error);
      setResult(`❌ Error: ${error.message}`);
      Alert.alert('Error', error.message || 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent}>
      <PageHeader icon="mail-outline" title="Prueba de email" subtitle="Verificá la configuración de los mensajes del sistema" />
      <Card style={{ padding: spacing.xl }}>
        
        <Text style={[s.text, { marginBottom: spacing.xl }]}>
          Envía un email de prueba para verificar que la configuración está correcta.
        </Text>

        <Button
          variant="primary"
          loading={loading}
          disabled={loading}
          onPress={sendTestEmail}
        >
          {loading ? "Enviando..." : "Enviar Email de Prueba"}
        </Button>

        {result && (
          <View style={{ marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.md, backgroundColor: result.startsWith('✅') ? colors.mint[100] : colors.accent[100] }}>
            <Text style={s.text}>{result}</Text>
          </View>
        )}

        <View style={{ marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary[50], gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="person-outline" size={17} color={colors.primary[600]} /><Text style={s.text}>
            <Text style={{ fontFamily: typography.family.bold }}>Destinatario:</Text> ivanhoberuk@gmail.com
          </Text>
          </View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="send-outline" size={17} color={colors.primary[600]} /><Text style={s.text}>
            <Text style={{ fontFamily: typography.family.bold }}>Remitente:</Text> noreply@mfspy.org.py
          </Text></View>
        </View>
      </Card>
    </ScrollView>
  );
}

