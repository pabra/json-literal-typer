#!/usr/bin/env node

import arg from 'arg';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import analyze from './analyze';
import typify from './typify';
import { getOwnPackageJson, getOwnVersionString, tryCatchThrow } from './utils';

const args = arg({
  // Types
  '--help': Boolean,
  '--version': Boolean,
  '--in-file': String,
  '--out-file': String,
  '--root-name': String,

  // Aliases
  '-h': '--help',
  '-v': '--version',
  '-i': '--in-file',
  '-o': '--out-file',
  '-n': '--root-name',
});

const showHelp = (): void => {
  const { description } = getOwnPackageJson();
  const help = [
    getOwnVersionString(),
    description,
    '',
    'USAGE:',
    `    ${basename(process.argv[1])} [OPTIONS] < IN_FILE > OUT_FILE`,
    `    curl -q JSON_API | ${basename(process.argv[1])} [OPTIONS]`,
    `    ${basename(process.argv[1])} [OPTIONS]`,
    '',
    'OPTIONS:',
    '    -h, --help',
    '        show this help',
    '',
    '    -v, --version',
    '        show version',
    '',
    '    -i <IN_FILE_NAME>, --in-file=<IN_FILE_NAME>',
    '        path to JSON file to read from',
    '',
    '    -o <OUT_FILE_NAME>, --out-file=<OUT_FILE_NAME>',
    '        path to TypeScript file to write to',
    '',
    '    -n, --root-name <ROOT_TYPE_NAME>',
    '        name of the root type (will default to "Root")',
  ].join('\n');

  process.stdout.write(`${help}\n`);
};

const showVersion = (): void => {
  process.stdout.write(`${getOwnVersionString()}\n`);
};

const getCatchFn = (reason: string) => (err: any) => {
  process.stderr.write(reason + '\n');
  throw new Error(err);
};

if (args['--help']) {
  showHelp();
} else if (args['--version']) {
  showVersion();
} else {
  const inFileArg = args['--in-file'];
  const outFileArg = args['--out-file'];
  const rootTypeName = args['--root-name'];
  const inFile = inFileArg && resolve(inFileArg);
  const outFile = outFileArg && resolve(outFileArg);

  if (inFile && !existsSync(inFile)) {
    throw new Error('no such file: ' + inFile);
  }

  const inFileContent = tryCatchThrow(
    () => readFileSync(inFile ?? 0, 'utf-8'),
    getCatchFn('Error while reading in-file.'),
  );

  const parsedData = tryCatchThrow(
    () => JSON.parse(inFileContent),
    getCatchFn('Error while parsing JSON from in-file.'),
  );
  const analyzed = tryCatchThrow(
    () => analyze(parsedData, rootTypeName),
    getCatchFn('Error while analyzing in-file data.'),
  );

  const typified = tryCatchThrow(
    () => typify(analyzed),
    getCatchFn('Error while typifying in-file data.'),
  );

  tryCatchThrow(
    () => writeFileSync(outFile ?? 1, typified + '\n'),
    getCatchFn('Error while writing out-file.'),
  );
}
