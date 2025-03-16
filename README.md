# Description

This repository demonstrates  processing large numbers of Excel files using Node.js, achieving speeds of 20,000 files per minute. Processing here means extracting data of some cells from all the files. Please find the related blog post [here](https://example.com)

## Description

A practical exploration of different approaches to handle massive Excel file processing workloads in Node.js, comparing various worker thread patterns and optimizations.


## Usage & Installation

### Prerequisites
- Node.js 18+


### Install packages
```sh
npm ci
```

### Running the seeder 

```sh
npm run seed
```
This will create seed excel files in the directory specified in `INPUTS_DIR_PATH` in .env. `PERCENT_CORRUPT_FILES` % of these files will be corrupt and can block the thread they are run on or can cause heap overflow. You can specify the number of seed files in `NO_OF_SEED_FILES` env

### Running the scripts 

The srcipts will be run against files put by seeder in the input directory. There are 3 approaches where each appraoch's code is mentioned in a directory under `src`. 
To run the 3rd (and best) apprach, run

```
npm run exp3
```

This will extract data from all excel files and put it under `outputs` directory or the one specified in OUTPUTS_DIR_PATH directory
