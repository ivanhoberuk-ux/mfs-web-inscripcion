import { load, save } from '../utils/storage';
import type { Pueblo } from '../types';

const KEY = 'misiones:pueblos:cache';
const defaultPueblos: Pueblo[] = Array.from({length:10}).map((_,i)=>({ id: `p${i+1}`, nombre: `Pueblo ${i+1}`, cupo_max: 40, activo: true }));

export async function getPueblosCache(): Promise<Pueblo[]> { return load(KEY, defaultPueblos); }
export async function setPueblosCache(p: Pueblo[]) { await save(KEY, p); }
