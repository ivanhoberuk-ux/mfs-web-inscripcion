import { useState } from 'react';
import { View, Text, Alert, StyleSheet, ScrollView } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { supabase } from '../../src/integrations/supabase/client';

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
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Prueba de Email</Text>
        
        <Text style={styles.description}>
          Envía un email de prueba usando Resend para verificar que la configuración está correcta.
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
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Destinatario:</Text> ivanhoberuk@gmail.com
          </Text>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Remitente:</Text> onboarding@resend.dev
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    marginBottom: 24,
    opacity: 0.7,
  },
  resultBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  resultText: {
    fontSize: 14,
  },
  infoBox: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  bold: {
    fontWeight: 'bold',
  },
});
