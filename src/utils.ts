import { readFileSync } from 'fs';
import { join } from 'path';

const tryCatchThrow = <T>(tryFn: () => T, catchFn: (thing: any) => void): T => {
  try {
    return tryFn();
  } catch (err) {
    catchFn(err);
    throw new Error(err);
  }
};

const getPackageJson = (dir: string): Record<string, any> => {
  const path = join(dir, 'package.json');

  return JSON.parse(readFileSync(path, 'utf-8'));
};

const getOwnPackageJson = (): Record<string, any> => {
  try {
    // while development, __dirname is src/ -> package.json must be one dir up
    return getPackageJson(join(__dirname, '..'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  try {
    // after build, __dirname is dist/cjs/ -> package.json must be two dirs up
    return getPackageJson(join(__dirname, '..', '..'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  return {};
};

const getOwnVersionString = (): string => {
  const { name, version } = getOwnPackageJson();
  return `${name} version: ${version}`;
};

export { getOwnPackageJson, getOwnVersionString, tryCatchThrow };
