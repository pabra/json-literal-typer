import {
  ValuesByType,
  PrimitiveObject,
  NullObject,
  StringObject,
  NumberObject,
  BooleanObject,
  ArrayObject,
  ObjectObject,
  JsonTypeStr,
} from './analyze';

const invalidIdentifiers = new Set<string>([
  'Array',
  'ArrayBuffer',
  'AsyncFunction',
  'Atomics',
  'BigInt',
  'BigInt64Array',
  'BigUint64Array',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'Float32Array',
  'Float64Array',
  'Function',
  'Generator',
  'GeneratorFunction',
  'Infinity',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'InternalError',
  'Intl',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Null',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'SharedArrayBuffer',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Undefined',
  'WeakMap',
  'WeakSet',
  'WebAssembly',
  'XMLHttpRequest',
]);

function uniqueIdentifier(name: string, identifiers: Set<string>) {
  const capitalizedName = name.substr(0, 1).toUpperCase() + name.substr(1);
  let testName = capitalizedName;
  let i = 2;

  while (invalidIdentifiers.has(testName) || identifiers.has(testName)) {
    testName = `${capitalizedName}${i++}`;
  }

  identifiers.add(testName);

  return testName;
}

interface Node {
  name: string;
  identifier: string;
  path: string;
  stringified: string;
}

interface Nodes {
  byPath: Record<string, Node>;
  byOrder: Node[];
}

interface CountedValues {
  count: number;
  value: string;
}

function getValuesByType(
  typeValues: ValuesByType,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  // forceType: boolean,
  baseType: boolean,
): CountedValues {
  const values = Object.keys(typeValues)
    .sort()
    .map(typeName => {
      const nestedThing = typeValues[typeName as JsonTypeStr];
      if (!nestedThing) {
        throw new Error();
      }
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return typifyThing(
        nestedThing,
        path,
        nodes,
        ids,
        path === '$' || nestedThing.type === 'object',
        baseType,
      );
    });

  return {
    count: values.reduce((sum, v) => sum + v.count, 0),
    value: values.map(v => v.value).join(' | '),
  };
}

function addNode(node: Node, nodes: Nodes) {
  nodes.byOrder.push(node);

  if (Object.prototype.hasOwnProperty.call(nodes.byPath, node.path)) {
    throw new Error(
      'there is already a node for path ' +
        node.path +
        ' ' +
        nodes.byPath[node.path].name,
    );
  }

  nodes.byPath[node.path] = node;
}

function typifyNull(
  thing: NullObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const value = baseType ? thing.type : thing.type;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyString(
  thing: StringObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const value = baseType
    ? thing.type
    : Array.from(thing.values)
        .sort()
        .map(str => `"${str.replace(/"/g, '\\"')}"`)
        .join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyNumber(
  thing: NumberObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const value = baseType
    ? thing.type
    : Array.from(thing.values)
        .sort()
        .join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyBoolean(
  thing: BooleanObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const value = baseType
    ? thing.type
    : Array.from(thing.values)
        .sort()
        .join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyArray(
  thing: ArrayObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const values = getValuesByType(
    thing.values,
    path + '[*]',
    nodes,
    ids,
    // forceType,
    baseType,
  );

  const value =
    values.count === 0
      ? 'never[]'
      : values.count === 1
      ? `${values.value}[]`
      : `(${values.value})[]`;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyObject(
  thing: ObjectObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType: boolean,
  baseType: boolean,
) {
  const innerValue = Object.keys(thing.keys)
    .sort()
    .map(keyname => {
      const values = getValuesByType(
        thing.keys[keyname].values,
        path + `['${keyname}']`,
        nodes,
        ids,
        // forceType,
        baseType,
      );

      return `${keyname}${thing.keys[keyname].optional ? '?' : ''}: ${
        values.value
      };`;
    })
    .join('\n  ');

  const value = `{\n  ${innerValue}\n}`;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing.name, ids);
  const stringified = `interface ${identifier} ${value}`;
  const node: Node = { name: thing.name, identifier, path, stringified };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyThing(
  thing: PrimitiveObject | ArrayObject | ObjectObject,
  path: string,
  nodes: Nodes,
  ids: Set<string>,
  forceType = false,
  baseType = false,
): CountedValues {
  switch (thing.type) {
    case 'null':
      return typifyNull(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    case 'string':
      return typifyString(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    case 'number':
      return typifyNumber(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    case 'boolean':
      return typifyBoolean(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    case 'array':
      return typifyArray(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    case 'object':
      return typifyObject(
        thing,
        path + `{${thing.type}}`,
        nodes,
        ids,
        forceType,
        baseType,
      );

    default:
      throw new Error();
  }
}

function typify(result: PrimitiveObject | ArrayObject | ObjectObject) {
  const nodes: Nodes = { byPath: {}, byOrder: [] };
  const identifiers = new Set<string>();
  typifyThing(
    result,
    '$',
    nodes,
    identifiers,
    true, // forceType
    false, // baseType
  );

  return nodes.byOrder.map(node => node.stringified).join('\n');
}

export default typify;
