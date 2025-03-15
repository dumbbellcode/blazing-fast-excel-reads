import {
  isMainThread,
  parentPort,
  workerData,
} from 'node:worker_threads';
import { extractCellsFromWsBuffer } from '../utils';

if (!isMainThread) {
  const buf = workerData.fileBuffer as Buffer;
  const cellsToRead = workerData.cellsToRead as string[];
  const data = extractCellsFromWsBuffer(buf, cellsToRead);
  parentPort?.postMessage({ ...data, fileName: workerData.fileName });
}
