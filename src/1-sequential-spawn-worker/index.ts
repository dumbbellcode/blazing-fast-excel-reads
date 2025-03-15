import { isMainThread, Worker } from 'node:worker_threads';
import {
  getFilesDirPath,
  getOutputsDir,
  logProgress,
  resolvePromiseUnderMs,
} from '../utils';
import fs from 'node:fs';
import path from 'node:path';
import './worker';

const cellsToExtract: string[] = ['A19', 'D4', 'C12'];
const workerTimeout = 3000;
const workerMemoryLimitMB = 250;

if (isMainThread) {
  extractInformation();
}

async function extractInformation() {
  const filesDir = getFilesDirPath();
  const files = fs.readdirSync(filesDir);

  const successData = [];
  const failureData = [];

  let index = 0;
  const interval = setInterval(() => {
    logProgress(files.length, index + 1);
  }, 2000);

  for (index = 0; index < files.length; index++) {
    const file = files[index];
    const filePath = path.join(filesDir, file);
    const buffer = fs.readFileSync(filePath);
    const extractDataPromise = spawnWorkerAndExtractData(
      buffer,
      cellsToExtract,
      file,
    );
    const extracted = await resolvePromiseUnderMs(
      extractDataPromise,
      workerTimeout,
    );
    if (extracted.success) {
      successData.push(extracted);
    } else {
      failureData.push(extracted);
    }
  }

  clearInterval(interval);

  const outputDir = getOutputsDir();
  fs.writeFileSync(`${outputDir}/success.json`, JSON.stringify(successData));
  fs.writeFileSync(`${outputDir}/failures.json`, JSON.stringify(failureData));
}

function spawnWorkerAndExtractData(
  fileBuffer: Buffer,
  cellsToRead: string[],
  fileName: string,
) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      resourceLimits: { maxOldGenerationSizeMb: workerMemoryLimitMB },
      execArgv: [
        '--experimental-strip-types',
        '--disable-warning=ExperimentalWarning',
        '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      ],
      workerData: { fileBuffer, cellsToRead, fileName },
    });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0)
        reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
}
