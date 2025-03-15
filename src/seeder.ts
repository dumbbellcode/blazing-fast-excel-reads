import { utils, WorkBook, writeFileAsync, writeFile } from 'xlsx';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid'; // generate unique id
import 'dotenv/config';
import { createInputsDir, getFilesDirPath } from './utils';

createInputsDir();
const filesDir = getFilesDirPath();

const getNewWorkbook = (): WorkBook => {
  const workbook = utils.book_new();

  workbook.SheetNames = [];
  workbook.Sheets = {};

  const data = [];
  for (let row = 0; row < 100; row++) {
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

const getNewWorkbooksMultiple = (cnt = 20): WorkBook[] => {
  return Array.from({ length: cnt }).map(() => getNewWorkbook());
};

const writeWorkbook = (workbook: WorkBook): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    writeFile(workbook, `${filesDir}/${uuidv4()}.xlsx`);
    resolve(true);
  });
};

const writeWorkbooksParallely = async (
  workbooks: WorkBook[],
): Promise<boolean[]> => {
  return Promise.all(workbooks.map((workbook) => writeWorkbook(workbook)));
};

const seedWorkbooks = async (parallelism = 20) => {
  const workbooks = getNewWorkbooksMultiple(parallelism);
  await writeWorkbooksParallely(workbooks);
  console.log(`Completed writing ${parallelism} workbooks`);
};

seedWorkbooks(20);
