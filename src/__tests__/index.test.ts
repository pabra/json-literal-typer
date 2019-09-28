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

test('should return Types', () => {
  const obj = { a: 1 };
  const expectation = 'interface Root {\n    a: 1;\n}\n';

  const analyzed = analyze(obj);
  const typified = typify(analyzed);

  expect(typified).toEqual(expectation);
});
