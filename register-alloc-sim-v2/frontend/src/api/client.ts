import axios from 'axios';
import type {
  CompileRequest, CompileResponse,
  AllocateRequest, AllocateResponse,
  LivenessResponse, PresetProgram,
} from '../types';

const api = axios.create({ baseURL: '/api' });

export async function compile(req: CompileRequest): Promise<CompileResponse> {
  const { data } = await api.post<CompileResponse>('/compile', req);
  return data;
}

export async function allocate(req: AllocateRequest): Promise<AllocateResponse> {
  const { data } = await api.post<AllocateResponse>('/allocate', req);
  return data;
}

export async function getLiveness(ir: string): Promise<LivenessResponse> {
  const { data } = await api.post<LivenessResponse>('/liveness', { ir });
  return data;
}

export async function getPresets(): Promise<PresetProgram[]> {
  const { data } = await api.get<PresetProgram[]>('/presets');
  return data;
}
