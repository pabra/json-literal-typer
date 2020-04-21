import analyze, { jsonify, typify } from '../';
import * as ts from 'typescript';
import { writeFile, PathLike, exists, mkdir } from 'fs';
import rimraf from 'rimraf';
import { promisify, inspect } from 'util';
import { normalize } from 'path';
const existsP = promisify(exists);
const mkdirP = promisify(mkdir);
const rimrafP = promisify(rimraf);
const writeFileP = promisify(writeFile);

const testData = [
  {
    name: 'plain string',
    in: 'str',
    jsonOut: { path: '$', type: 'string', values: ['str'] },
    tsOut: 'type Root = "str";',
  },
  {
    name: 'plain number',
    in: 5,
    jsonOut: { path: '$', type: 'number', values: [5] },
    tsOut: 'type Root = 5;',
  },
  {
    name: 'plain boolean',
    in: false,
    jsonOut: { path: '$', type: 'boolean', values: [false] },
    tsOut: 'type Root = false;',
  },
  {
    name: 'plain null',
    in: null,
    jsonOut: { path: '$', type: 'null' },
    tsOut: 'type Root = null;',
  },
  {
    name: 'plain object',
    in: {},
    jsonOut: { keys: {}, path: '$', type: 'object' },
    tsOut: 'interface Root {\n  \n}',
  },
  {
    name: 'plain array',
    in: [],
    jsonOut: { path: '$', type: 'array', values: [] },
    tsOut: 'type Root = never[];',
  },
  {
    name: 'simple object',
    in: { a: 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        a: {
          values: [{ type: 'number', path: "$['a']{number}", values: [1] }],
        },
      },
    },
    tsOut: 'interface Root {\n  a: 1;\n}',
  },
  {
    name: 'object with spaces in key',
    in: { 'With some spaces': 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        'With some spaces': {
          values: [
            {
              type: 'number',
              path: `$['With some spaces']{number}`,
              values: [1],
            },
          ],
        },
      },
    },
    tsOut: 'interface Root {\n  "With some spaces": 1;\n}',
  },
  {
    name: 'object starting with number starting key',
    in: { '2numberStart': 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        '2numberStart': {
          values: [
            { type: 'number', path: `$['2numberStart']{number}`, values: [1] },
          ],
        },
      },
    },
    tsOut: 'interface Root {\n  "2numberStart": 1;\n}',
  },
  {
    name:
      'objects with non-word characters in keys replace chars with "X" in TypeScript interfaces',
    in: {
      data: {
        'item1_*': { a: 1 },
        'item2_*': { b: 2 },
      },
    },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        data: {
          values: [
            {
              type: 'object',
              path: "$['data']{object}",
              keys: {
                'item1_*': {
                  values: [
                    {
                      type: 'object',
                      path: "$['data']{object}['item1_*']{object}",
                      keys: {
                        a: {
                          values: [
                            {
                              type: 'number',
                              path:
                                "$['data']{object}['item1_*']{object}['a']{number}",
                              values: [1],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
                'item2_*': {
                  values: [
                    {
                      type: 'object',
                      path: "$['data']{object}['item2_*']{object}",
                      keys: {
                        b: {
                          values: [
                            {
                              type: 'number',
                              path:
                                "$['data']{object}['item2_*']{object}['b']{number}",
                              values: [2],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    },
    tsOut: [
      'interface Item1_X {',
      '  a: 1;',
      '}',
      'interface Item2_X {',
      '  b: 2;',
      '}',
      'interface Data {',
      '  "item1_*": Item1_X;',
      '  "item2_*": Item2_X;',
      '}',
      'interface Root {',
      '  data: Data;',
      '}',
    ].join('\n'),
  },
  {
    name: 'object with emojis in keys',
    in: { '🥰👍': 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        '🥰👍': {
          values: [{ type: 'number', path: `$['🥰👍']{number}`, values: [1] }],
        },
      },
    },
    tsOut: 'interface Root {\n  "🥰👍": 1;\n}',
  },
  {
    name: 'object with keys of different and optional types',
    in: {
      data: [
        { a: { x: 2 } },
        { a: { x: 1 }, c: null },
        { a: { x: '1' }, b: { x: '3' } },
        { a: { x: 1 }, b: false },
        { a: { x: 1 }, b: ['c', 'B'] },
        { a: { x: 1 }, b: ['a'] },
        { a: { x: 1 }, b: ['B', 'c'] },
      ],
    },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        data: {
          values: [
            {
              type: 'array',
              path: "$['data']{array}",
              values: [
                {
                  type: 'object',
                  path: "$['data']{array}[*]{object}",
                  keys: {
                    a: {
                      values: [
                        {
                          type: 'object',
                          path: "$['data']{array}[*]{object}['a']{object}",
                          keys: {
                            x: {
                              values: [
                                {
                                  type: 'number',
                                  path:
                                    "$['data']{array}[*]{object}['a']{object}['x']{number}",
                                  values: [2, 1],
                                },
                                {
                                  type: 'string',
                                  path:
                                    "$['data']{array}[*]{object}['a']{object}['x']{string}",
                                  values: ['1'],
                                },
                              ],
                            },
                          },
                        },
                      ],
                    },
                    c: {
                      values: [
                        {
                          type: 'null',
                          path: "$['data']{array}[*]{object}['c']{null}",
                        },
                      ],
                      optional: true,
                    },
                    b: {
                      values: [
                        {
                          type: 'object',
                          path: "$['data']{array}[*]{object}['b']{object}",
                          keys: {
                            x: {
                              values: [
                                {
                                  type: 'string',
                                  path:
                                    "$['data']{array}[*]{object}['b']{object}['x']{string}",
                                  values: ['3'],
                                },
                              ],
                            },
                          },
                        },
                        {
                          type: 'boolean',
                          path: "$['data']{array}[*]{object}['b']{boolean}",
                          values: [false],
                        },
                        {
                          type: 'array',
                          path: "$['data']{array}[*]{object}['b']{array}",
                          values: [
                            {
                              type: 'string',
                              path:
                                "$['data']{array}[*]{object}['b']{array}[*]{string}",
                              values: ['c', 'B', 'a'],
                            },
                          ],
                        },
                      ],
                      optional: true,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
    tsOut: [
      'interface A {',
      '  x: 1 | 2 | "1";',
      '}',
      'interface B {',
      '  x: "3";',
      '}',
      'interface Data {',
      '  a: A;',
      '  b?: ("B" | "a" | "c")[] | false | B;',
      '  c?: null;',
      '}',
      'interface Root {',
      '  data: Data[];',
      '}',
    ].join('\n'),
  },
  {
    name: 'complex object',
    in: {
      data: [
        {
          id: 1,
          name: 'b',
          mix: 3,
          strArr: ['d'],
          optNull: null,
        },
        {
          id: 2,
          name: 'a',
          mix: 'c',
          strArr: ['e'],
          optArr: [
            {
              bool: true,
              mixArr: 4,
              optNeverArr: [],
              root: { r: 'should not become Root' },
            },
            {
              bool: false,
              mixArr: ['f', 5],
            },
          ],
        },
      ],
    },
    config: {
      byPath: {
        "$['data']{array}[*]{object}['name']{string}": {
          baseType: true,
          forceType: true,
        },
      },
    },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        data: {
          values: [
            {
              type: 'array',
              path: "$['data']{array}",
              values: [
                {
                  type: 'object',
                  path: "$['data']{array}[*]{object}",
                  keys: {
                    id: {
                      values: [
                        {
                          type: 'number',
                          path: "$['data']{array}[*]{object}['id']{number}",
                          values: [1, 2],
                        },
                      ],
                    },
                    name: {
                      values: [
                        {
                          type: 'string',
                          path: "$['data']{array}[*]{object}['name']{string}",
                          values: ['b', 'a'],
                        },
                      ],
                    },
                    mix: {
                      values: [
                        {
                          type: 'number',
                          path: "$['data']{array}[*]{object}['mix']{number}",
                          values: [3],
                        },
                        {
                          type: 'string',
                          path: "$['data']{array}[*]{object}['mix']{string}",
                          values: ['c'],
                        },
                      ],
                    },
                    strArr: {
                      values: [
                        {
                          type: 'array',
                          path: "$['data']{array}[*]{object}['strArr']{array}",
                          values: [
                            {
                              type: 'string',
                              path:
                                "$['data']{array}[*]{object}['strArr']{array}[*]{string}",
                              values: ['d', 'e'],
                            },
                          ],
                        },
                      ],
                    },
                    optNull: {
                      values: [
                        {
                          type: 'null',
                          path: "$['data']{array}[*]{object}['optNull']{null}",
                        },
                      ],
                      optional: true,
                    },
                    optArr: {
                      values: [
                        {
                          type: 'array',
                          path: "$['data']{array}[*]{object}['optArr']{array}",
                          values: [
                            {
                              type: 'object',
                              path:
                                "$['data']{array}[*]{object}['optArr']{array}[*]{object}",
                              keys: {
                                bool: {
                                  values: [
                                    {
                                      type: 'boolean',
                                      path:
                                        "$['data']{array}[*]{object}['optArr']{array}[*]{object}['bool']{boolean}",
                                      values: [true, false],
                                    },
                                  ],
                                },
                                mixArr: {
                                  values: [
                                    {
                                      type: 'number',
                                      path:
                                        "$['data']{array}[*]{object}['optArr']{array}[*]{object}['mixArr']{number}",
                                      values: [4],
                                    },
                                    {
                                      type: 'array',
                                      path:
                                        "$['data']{array}[*]{object}['optArr']{array}[*]{object}['mixArr']{array}",
                                      values: [
                                        {
                                          type: 'string',
                                          path:
                                            "$['data']{array}[*]{object}['optArr']{array}[*]{object}['mixArr']{array}[*]{string}",
                                          values: ['f'],
                                        },
                                        {
                                          type: 'number',
                                          path:
                                            "$['data']{array}[*]{object}['optArr']{array}[*]{object}['mixArr']{array}[*]{number}",
                                          values: [5],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                optNeverArr: {
                                  values: [
                                    {
                                      type: 'array',
                                      path:
                                        "$['data']{array}[*]{object}['optArr']{array}[*]{object}['optNeverArr']{array}",
                                      values: [],
                                    },
                                  ],
                                  optional: true,
                                },
                                root: {
                                  values: [
                                    {
                                      type: 'object',
                                      path:
                                        "$['data']{array}[*]{object}['optArr']{array}[*]{object}['root']{object}",
                                      keys: {
                                        r: {
                                          values: [
                                            {
                                              type: 'string',
                                              path:
                                                "$['data']{array}[*]{object}['optArr']{array}[*]{object}['root']{object}['r']{string}",
                                              values: [
                                                'should not become Root',
                                              ],
                                            },
                                          ],
                                        },
                                      },
                                    },
                                  ],
                                  optional: true,
                                },
                              },
                            },
                          ],
                        },
                      ],
                      optional: true,
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    },
    tsOut: [
      'type Name = string;',
      'interface Root2 {',
      '  r: "should not become Root";',
      '}',
      'interface OptArr {',
      '  bool: false | true;',
      '  mixArr: (5 | "f")[] | 4;',
      '  optNeverArr?: never[];',
      '  root?: Root2;',
      '}',
      'interface Data {',
      '  id: 1 | 2;',
      '  mix: 3 | "c";',
      '  name: Name;',
      '  optArr?: OptArr[];',
      '  optNull?: null;',
      '  strArr: ("d" | "e")[];',
      '}',
      'interface Root {',
      '  data: Data[];',
      '}',
    ].join('\n'),
  },
];

async function compile(
  tsString: string,
  label: string,
  options: ts.CompilerOptions,
) {
  const fileName: PathLike = normalize(`${options.outDir}/temp-${label}.ts`);

  await writeFileP(fileName, tsString);

  const program = ts.createProgram([fileName], options);
  const emitResult = program.emit();

  const allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!,
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character +
          1}): ${message}`,
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
    }
  });

  return !emitResult.emitSkipped;
}

const tsOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
  declaration: true,
  outDir: './src/__tests__/out',
  exclude: ['node_modules', 'lib', '**/__tests__/*', 'src/__tests__'],
  strict: true,
  esModuleInterop: true,
  forceConsistentCasingInFileNames: true,
  noEmitOnError: true,
  removeComments: true,
  jsx: ts.JsxEmit.Preserve,
  noUnusedParameters: true,
  noUnusedLocals: true,
  noImplicitReturns: true,
};

beforeAll(async () => {
  const outTs = normalize(tsOptions.outDir);
  if (await existsP(outTs)) {
    await rimrafP(outTs);
  }
  mkdirP(outTs);
});

testData.forEach(data => {
  const analyzed = analyze(data.in);
  const jsonified = jsonify(analyzed);
  const typified = typify(analyzed, data.config);

  it('should get expected json output for: ' + data.name, () => {
    expect(jsonified).toEqual(data.jsonOut);
  });

  it('should get expected typescript for: ' + data.name, () => {
    expect(typified).toEqual(data.tsOut);
  });

  it('should produce compileable typescript for: ' + data.name, async () => {
    const formatOpts = {
      colors: false,
      maxArrayLength: Infinity,
      breakLength: 80,
      depth: Infinity,
    };
    let str: string;
    switch (jsonified.type) {
      case 'string':
        str = `${typified}\nconst i: Root = "${data.in}"`;
        break;
      case 'object':
        str = `${typified}\nconst i: Root = ${inspect(data.in, formatOpts)}`;
        break;
      case 'array':
        str = [...jsonified.values].length
          ? `${typified}\nconst i: Root = ${inspect(data.in, formatOpts)}`
          : `${typified}`;
        break;
      default:
        str = `${typified}\nconst i: Root = ${data.in}`;
        break;
    }
    const compiled = await compile(
      str,
      data.name.replace(/\s/gi, '_'),
      tsOptions,
    );
    expect(compiled).toBeTruthy();
  });
});
