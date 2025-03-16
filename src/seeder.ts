import { utils, WorkBook, writeFile } from 'xlsx';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';
import { createInputsDir, getFilesDirPath } from './utils';
import { readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const percentOFCorruptFiles = process.env.PERCENT_CORRUPT_FILES;
const noOfSeedFiles = process.env.NO_OF_SEED_FILES;

if (!percentOFCorruptFiles) {
  throw 'PERCENT_CORRUPT_FILES env is required';
}
if (!noOfSeedFiles) {
  throw 'NO_OF_SEED_FILES env is required';
}

let noOfCorruptFiles =
  (Number.parseFloat(percentOFCorruptFiles) * Number.parseInt(noOfSeedFiles)) /
  100;
noOfCorruptFiles = Math.max(Math.ceil(noOfCorruptFiles), 1);

const corruptFilesDir = join(__dirname, 'corrupt-assets');
const corruptFiles = readdirSync(corruptFilesDir);

createInputsDir();
const filesDir = getFilesDirPath();

const getNewWorkbook = (): WorkBook => {
  const workbook = utils.book_new();

  workbook.SheetNames = [];
  workbook.Sheets = {};

  const data = [];
  const noOfRows = Math.floor(Math.random() * 20) + 80; // A number between 80 and 100
  for (let row = 0; row < noOfRows; row++) {
    const obj: Record<string, string> = {};
    for (let col = 0; col < 70; col++) {
      obj[`Column ${col}`] = faker.string.alphanumeric(10);
    }
    data.push(obj);
  }
  const worksheet = utils.json_to_sheet(data);
  utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  return workbook;
};

const getNewWorkbooksBatch = (cnt = 20): WorkBook[] => {
  return Array.from({ length: cnt }).map(() => getNewWorkbook());
};

const writeWorkbook = (workbook: WorkBook) => {
  writeFile(workbook, `${filesDir}/${uuidv4()}.xlsx`);
};

const writeWorkbooksBatch = (workbooks: WorkBook[]) => {
  return workbooks.map((workbook) => writeWorkbook(workbook));
};

const seedWorkbooks = async () => {
  console.log('Seeder is running');
  const filesInEachBatch = Math.max(
    Number.parseInt(noOfSeedFiles) / noOfCorruptFiles,
  );

  let seededFilesCount = 0;
  let corruptFilesCount = 0;
  while (seededFilesCount < Number.parseInt(noOfSeedFiles)) {
    let batchSize = filesInEachBatch;
    if (Number.parseInt(noOfSeedFiles) - seededFilesCount < filesInEachBatch) {
      batchSize = Number.parseInt(noOfSeedFiles) - seededFilesCount;
    }

    // Seed batchSize - 1 normal files and 1 corrupt file
    const workbooks = getNewWorkbooksBatch(batchSize - 1);
    writeWorkbooksBatch(workbooks);
    seededFilesCount += batchSize;
    copyRandomCorruptFileToInputs();
    ++corruptFilesCount;
  }
  console.log(
    `Seeded ${seededFilesCount - corruptFilesCount} normal files & ${corruptFilesCount} corrupt file(s)`,
  );
};

const copyRandomCorruptFileToInputs = () => {
  const randomFile =
    corruptFiles[Math.floor(Math.random() * corruptFiles.length)];
  const newFileName = `${uuidv4()}-${randomFile}`;
  const srcPath = join(corruptFilesDir, randomFile);
  const destPath = join(filesDir, newFileName);
  copyFileSync(srcPath, destPath);
};

seedWorkbooks();
