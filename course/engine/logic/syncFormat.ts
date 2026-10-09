/* 同步文件（云端 Gist 里的 JSON、导出的文件）的格式、校验和读取。纯函数。
   文件内容：{ schema, app, updatedAt, device, progress }。progress 就是 localStorage['hands-on-vue3-v1'] 的内容。
   schema 是进度结构的版本号：旧版站点读到更新的 schema 时只读合并、不覆盖云端。
   设备标识是随机生成的短 id，不含任何个人信息。 */
import type { Progress } from '../types.ts';
import { isObj } from './merge.ts';

/** 进度结构的版本。给进度结构加字段（可选字段，不改旧字段含义）不用升；改了含义或类型才升，并让旧版读到时提示刷新 */
export const PROGRESS_SCHEMA = 1;
export const SYNC_APP = 'hands-on-vue3';
export const SYNC_FILE = 'hands-on-vue3-progress.json';
export const SYNC_DESC = '动手学 Vue 3 学习进度（自动同步，请勿手动编辑）';

export interface Envelope {
  schema: number;
  app: string;
  updatedAt: number;
  device: string;
  progress: Progress;
}

export const makeEnvelope = (progress: Progress, device: string, now: number): Envelope => ({
  schema: PROGRESS_SCHEMA,
  app: SYNC_APP,
  updatedAt: now,
  device,
  progress,
});

export type ParseResult = { ok: true; env: Envelope; newer: boolean } | { ok: false; reason: 'json' | 'shape' | 'app' };

/** 读同步文件。不是合法 JSON、缺 schema 或 progress、不是本站的文件，都返回失败原因（不抛异常） */
export function parseEnvelope(text: string): ParseResult {
  let v: any;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'json' };
  }
  if (!isObj(v) || !Number.isInteger(v.schema) || v.schema < 1 || !isObj(v.progress)) return { ok: false, reason: 'shape' };
  if (v.app !== undefined && v.app !== SYNC_APP) return { ok: false, reason: 'app' };
  return {
    ok: true,
    newer: v.schema > PROGRESS_SCHEMA,
    env: { schema: v.schema, app: SYNC_APP, updatedAt: Number(v.updatedAt) || 0, device: String(v.device || ''), progress: v.progress },
  };
}

/** 进度概况，导入前给用户看 */
export function summarize(p: Progress): { chapters: number; done: number; cards: number } {
  let chapters = 0;
  let done = 0;
  for (const [k, v] of Object.entries(p)) {
    if (k.startsWith('__') || !isObj(v)) continue;
    chapters++;
    if (v.done) done++;
  }
  return { chapters, done, cards: Object.keys(isObj(p.__srs) ? p.__srs : {}).length };
}
