import { isMainThread, markAsUncloneable, Worker } from 'node:worker_threads';
import { getFilesDirPath, getOutputsDir, logProgress } from '../utils';
import fs from 'node:fs';
import path from 'node:path';
import './worker';
import { cpus } from 'node:os';
import { EventEmitter } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
const maxWorkers = Math.max(1, cpus().length - 1);

enum Events {
  WorkerStart = 'WorkerStart',
  WorkerMessage = 'WorkerMessage',
  WorkerError = 'WorkerError',
  WorkerExit = 'WorkerExit',
}

const cellsToRead: string[] = ['A1', 'A19', 'D4', 'C12'];
const workertimeout = 2000;
const workerMemoryLimitMB = 250;
const emitter = new EventEmitter();

if (isMainThread) {
  extractInformation();
}

async function extractInformation() {
  const filesDir = getFilesDirPath();
  const files = fs.readdirSync(filesDir);

  const successData: any[] = [];
  const failureData: any[] = [];

  // For a CPU with N cores, create N-1 worker threads
  const workerPool: Record<string, Worker> = {};
  for (let idx = 0; idx < maxWorkers; idx++) {
    const worker = getNewWorker();
    workerPool[worker.threadId] = worker;
  }
  console.log('started all workers');
  console.time('scriptCompletionTime');

  const originalSize = files.length;
  const logProgressAfterMs = 3000;
  const interval = setInterval(() => {
    const currentSize = files.length;
    logProgress(originalSize, originalSize - currentSize);
  }, logProgressAfterMs);
  let timeout: string | number | NodeJS.Timeout | undefined;
  const timersMap: Record<string, any> = {};

  const processAFile = (threadId: string) => {
    const fileName = files.pop();

    if (!fileName) {
      workerPool[threadId].terminate();
      return;
    }

    const filePath = path.join(filesDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const worker = workerPool[threadId];
    timeout = setTimeout(() => {
      worker.terminate();
      failureData.push({
        fileName,
        message: 'Worker timed out',
      });
    }, workertimeout);
    const randomId = uuidv4();
    timersMap[randomId] = timeout;
    worker.postMessage({
      fileBuffer,
      cellsToRead,
      fileName,
      timeoutId: randomId,
    });
  };

  emitter.on(Events.WorkerStart, ({ threadId }) => {
    processAFile(threadId);
  });

  emitter.on(Events.WorkerMessage, ({ timeoutId, threadId, ...message }) => {
    clearTimeout(timersMap[timeoutId]);
    delete timersMap[timeoutId];

    if (message.success) {
      successData.push(message);
    } else {
      failureData.push(message);
    }

    processAFile(threadId);
  });

  emitter.on(Events.WorkerError, ({ timeoutId, threadId, ...message }) => {
    clearTimeout(timersMap[timeoutId]);
    delete timersMap[timeoutId];
    failureData.push(message);

    processAFile(threadId);
  });

  emitter.on(Events.WorkerExit, ({ threadId }) => {
    delete workerPool[threadId];

    if (Object.keys(workerPool).length === 0) {
      onCompletion();
    }

    // Nothing to process
    if (!files.length) return;

    const worker = getNewWorker();
    workerPool[worker.threadId] = worker;
  });

  const onCompletion = () => {
    clearInterval(interval);
    console.log('Completed processing all files, you can find the extracted data in output directory');
    console.log(
      `Total files: ${originalSize}, Successful: ${successData.length}, Failed: ${failureData.length}`,
    );
    console.timeEnd('scriptCompletionTime');

    const outputDir = getOutputsDir();
    fs.writeFileSync(`${outputDir}/success.json`, JSON.stringify(successData));
    fs.writeFileSync(`${outputDir}/failures.json`, JSON.stringify(failureData));
  };
}

function getNewWorker() {
  const worker = new Worker(__filename, {
    resourceLimits: { maxOldGenerationSizeMb: workerMemoryLimitMB },
    execArgv: [],
  });

  const threadId = worker.threadId;
  worker.once('online', () => {
    emitter.emit(Events.WorkerStart, { threadId });
  });
  worker.on('message', (data) => {
    data.threadId = threadId;
    emitter.emit(Events.WorkerMessage, data);
  });
  worker.on('error', (err) => {
    emitter.emit(Events.WorkerError, { sucess: false, error: err, threadId });
  });
  worker.on('exit', (code) => {
    if (code !== 0) {
      emitter.emit(Events.WorkerExit, {
        sucess: 0,
        message: `Worker stopped with exit code ${code}`,
        threadId,
      });
    }
  });
  return worker;
}
