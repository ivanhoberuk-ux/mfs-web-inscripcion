import { StyleSheet } from 'react-native';
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f6f9f7', padding: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#0b2433', marginBottom: 8 },
  text: { fontSize: 16, color: '#10313f' },
  small: { fontSize: 13, color: '#35505b' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 },
  input: { borderWidth: 1, borderColor: '#dde5ea', backgroundColor:'#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#0b8d62', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  danger: { backgroundColor: '#b91c1c' },
  buttonText: { color: '#fff', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { backgroundColor: '#e8f5ef', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginRight: 8 },
  label: { fontWeight: '600', marginBottom: 4, color: '#173e4d' }
});
