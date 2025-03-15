import { read } from 'xlsx';
import 'dotenv/config';
import fs from 'node:fs';
import { Message } from './types';

export function extractCellsFromWsBuffer(
  worksheetBuffer: Buffer,
  cellsToRead: string[],
) {
  try {
    const wb = read(worksheetBuffer, { type: 'buffer' });
    const data: Record<string, any> = {};
    const ws = wb.Sheets[wb.SheetNames[0]];
    for (const cellAdd of cellsToRead) {
      data[cellAdd] = ws[cellAdd]?.v ?? null;
    }

    return {
      success: true,
      data,
    };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : '',
    };
  }
}

export async function resolvePromiseUnderMs(
  promise: Promise<any>,
  milliseconds: number,
): Promise<Message> {
  return new Promise((res, rej) => {
    const timeOut = setTimeout(() => {
      res({ success: false, message: 'Time is up' });
    }, milliseconds);
    promise
      .then((result) => {
        clearTimeout(timeOut);
        res(result);
      })
      .catch((err) => {
        clearTimeout(timeOut);
        res({ success: false, message: err, stack: err.stack });
      });
  });
}

export function createInputsDir(): void {
  fs.mkdirSync(process.env.INPUTS_DIR_PATH ?? 'inputs', { recursive: true });
}

export function getOutputsDir(): string {
  const path = process.env.OUTPUTS_DIR_PATH ?? 'outputs';
  fs.mkdirSync(path, { recursive: true });
  return path;
}

export function getFilesDirPath(): string {
  return process.env.INPUTS_DIR_PATH ?? 'inputs';
}

export function logProgress(total: number, processed: number) {
  const perc = (processed / total) * 100;
  console.log(`Progress: ${perc}% | Processed ${processed} files `);
}
