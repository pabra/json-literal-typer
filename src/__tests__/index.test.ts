import analyze, { jsonify, typify } from '../';

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
    name: 'plain object',
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
    in: { "With some spaces": 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        "With some spaces": {
          values: [{ type: 'number', path: `$['With some spaces']{number}`, values: [1] }],
        },
      },
    },
    tsOut: 'interface Root {\n  "With some spaces": 1;\n}',
  },
  {
    name: 'object starting with number starting key',
    in: { "2numberStart": 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        "2numberStart": {
          values: [{ type: 'number', path: `$['2numberStart']{number}`, values: [1]}],
        },
      },
    },
    tsOut: 'interface Root {\n  "2numberStart": 1;\n}',
  },
  {
    name: 'object with unusual characters in key',
    in: { "*~@#$%^&*()_+=><?/": 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        "*~@#$%^&*()_+=><?/": {
          values: [{ type: 'number', path: `$['*~@#$%^&*()_+=><?/']{number}`, values: [1]}],
        },
      },
    },
    tsOut: 'interface Root {\n  "*~@#$%^&*()_+=><?/": 1;\n}',
  },
  {
    name: 'object with difficult to handle but valid characters in keys',
    in: { "\\\"": 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        "\\\"": {
          // eslint-disable-next-line no-useless-escape
          values: [{ type: 'number', path: `$['\\\"']{number}`, values: [1]}],
        },
      },
    },
    // eslint-disable-next-line no-useless-escape
    tsOut: 'interface Root {\n  "\\\"": 1;\n}',
  },
  {
    name: 'object with emojis in keys',
    in: { "🥰👍": 1 },
    jsonOut: {
      type: 'object',
      path: '$',
      keys: {
        "🥰👍": {
          values: [{ type: 'number', path: `$['🥰👍']{number}`, values: [1]}],
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

testData.forEach(data => {
  const analyzed = analyze(data.in);
  it('should get expected json output for: ' + data.name, () => {
    const jsonified = jsonify(analyzed);
    expect(jsonified).toEqual(data.jsonOut);
  });
  it('should get expected typescript output for: ' + data.name, () => {
    const typified = typify(analyzed, data.config);
    expect(typified).toEqual(data.tsOut);
  });
});