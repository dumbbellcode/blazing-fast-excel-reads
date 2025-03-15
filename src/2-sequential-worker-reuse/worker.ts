import {
  isMainThread,
  parentPort,
} from 'node:worker_threads';
import { extractCellsFromWsBuffer } from '../utils';

if (!isMainThread) {
  // Worker alive forever :)
  setInterval(() => {}, 1 << 30);

  parentPort?.on('message', ({ fileBuffer, cellsToRead, fileName }) => {
    const data = extractCellsFromWsBuffer(fileBuffer, cellsToRead);
    parentPort?.postMessage({ ...data, fileName });
  });
}
