import { isMainThread, Worker } from 'node:worker_threads';
import { getFilesDirPath, getOutputsDir, logProgress } from '../utils';
import fs from 'node:fs';
import path from 'node:path';
import './worker';
import { EventEmitter } from 'node:stream';

enum Events {
  WorkerStart = 'WorkerStart',
  WorkerMessage = 'WorkerMessage',
  WorkerError = 'WorkerError',
  WorkerExit = 'WorkerExit',
}

const cellsToRead: string[] = ['A19', 'D4', 'C12'];
const workerTimeout = 3000;
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

  const originalSize = files.length;
  const interval = setInterval(() => {
    const currentSize = files.length;
    logProgress(originalSize, originalSize - currentSize);
  }, 2000);
  let worker = getNewWorker();
  let timeOutId: string | number | NodeJS.Timeout | undefined;
  console.time('scriptCompletionTime');

  const processLastFile = () => {
    const fileName = files.pop();

    if (!fileName) {
      worker.terminate();
      return;
    }

    const filePath = path.join(filesDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);

    timeOutId = setTimeout(() => {
      worker.terminate();
      failureData.push({
        fileName,
        message: 'Worker timed out',
      });
    }, workerTimeout);
    worker.postMessage({ fileBuffer, cellsToRead, fileName });
  };

  emitter.on(Events.WorkerStart, () => {
    processLastFile();
  });

  emitter.on(Events.WorkerMessage, (message) => {
    clearTimeout(timeOutId);
    if (message.success) {
      successData.push(message);
    } else {
      failureData.push(message);
    }

    processLastFile();
  });

  emitter.on(Events.WorkerError, (message) => {
    clearTimeout(timeOutId);
    failureData.push(message);
    processLastFile();
  });

  emitter.on(Events.WorkerExit, () => {
    const fileName = files.pop();
    if (!fileName) {
      onCompletion();
      return;
    }
    worker = getNewWorker();
  });

  const onCompletion = () => {
    clearInterval(interval);
    console.log('Completed processing all files');
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

  worker.once('online', () => {
    emitter.emit(Events.WorkerStart, {});
  });
  worker.on('message', (data) => {
    emitter.emit(Events.WorkerMessage, data);
  });
  worker.on('error', (err) => {
    emitter.emit(Events.WorkerError, { sucess: false, error: err });
  });
  worker.on('exit', (code) => {
    if (code !== 0) {
      emitter.emit(Events.WorkerExit, {
        sucess: 0,
        message: `Worker stopped with exit code ${code}`,
      });
    }
  });
  return worker;
}
