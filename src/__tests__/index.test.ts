import analyze, { jsonify, typify } from '../';

test('should work simply', () => {
  const obj = { a: 1 };
  const expectation = {
    type: 'object',
    keys: { a: { values: [{ type: 'number', values: [1] }] } },
  };

  const result = jsonify(analyze(obj));

  expect(result).toEqual(expectation);
});

test('should work with more complex objects', () => {
  const obj = {
    data: [
      { a: { x: 2 } },
      { a: { x: 1 }, c: null },
      { a: { x: '1' }, b: { x: '3' } },
      { a: { x: 1 }, b: false },
      { a: { x: 1 }, b: ['c', 'B'] },
      { a: { x: 1 }, b: ['a'] },
      { a: { x: 1 }, b: ['B', 'c'] },
    ],
  };

  const expectation = {
    type: 'object',
    keys: {
      data: {
        values: [
          {
            type: 'array',
            values: [
              {
                type: 'object',
                keys: {
                  a: {
                    values: [
                      {
                        type: 'object',
                        keys: {
                          x: {
                            values: [
                              { type: 'number', values: [2, 1] },
                              { type: 'string', values: ['1'] },
                            ],
                          },
                        },
                      },
                    ],
                  },
                  c: { values: [{ type: 'null' }], optional: true },
                  b: {
                    values: [
                      {
                        type: 'object',
                        keys: {
                          x: { values: [{ type: 'string', values: ['3'] }] },
                        },
                      },
                      { type: 'boolean', values: [false] },
                      {
                        type: 'array',
                        values: [{ type: 'string', values: ['c', 'B', 'a'] }],
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
  };

  const result = analyze(obj);
  const jsonResult = jsonify(result);

  expect(jsonResult).toEqual(expectation);
});

const testData = [
  { in: 'str', out: 'type Root = "str";' },
  { in: 5, out: 'type Root = 5;' },
  { in: false, out: 'type Root = false;' },
  { in: null, out: 'type Root = null;' },
  { in: {}, out: 'interface Root {\n  \n}' },
  { in: [], out: 'type Root = never[];' },
  { in: { a: 1 }, out: 'interface Root {\n  a: 1;\n}' },
  {
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
            },
            {
              bool: false,
              mixArr: ['f', 5],
            },
          ],
        },
      ],
    },
    out:
      'interface OptArr {\n  bool: false | true;\n  mixArr: (5 | "f")[] | 4;\n  optNeverArr?: never[];\n}\ninterface Data {\n  id: 1 | 2;\n  mix: 3 | "c";\n  name: "a" | "b";\n  optArr?: OptArr[];\n  optNull?: null;\n  strArr: ("d" | "e")[];\n}\ninterface Root {\n  data: Data[];\n}',
  },
];

test('should return expected types', () => {
  testData.forEach(data => {
    const analyzed = analyze(data.in);
    const typified = typify(analyzed);
    expect(typified).toEqual(data.out);
  });
});
