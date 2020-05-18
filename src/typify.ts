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
  ArrayMember,
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
  'Coordinates',
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

function uniqueIdentifier(
  thing: PrimitiveObject | ArrayObject | ObjectObject,
  identifiers: Set<string>,
  typePrefix?: string,
) {
  let name: string;
  if (typeof thing.name === 'string') {
    name = thing.name;
  } else if (thing.parent !== null && typeof thing.parent.name === 'string') {
    name = thing.parent.name;
  } else {
    name = 'list';
  }

  if (typePrefix) {
    name = typePrefix + name;
  }

  name = name.replace(/\W+/gi, 'X');

  if (/^\d/.test(name)) {
    name = `N${name}`;
  }

  const localInvalidIdentifiers = new Set(invalidIdentifiers);
  if (thing.parent !== null) {
    localInvalidIdentifiers.add('Root');
  }
  const capitalizedName = name.substr(0, 1).toUpperCase() + name.substr(1);
  let testName = capitalizedName;
  let i = 2;

  while (localInvalidIdentifiers.has(testName) || identifiers.has(testName)) {
    testName = `${capitalizedName}${i++}`;
  }

  identifiers.add(testName);

  return testName;
}

interface Node {
  name: string | ArrayMember;
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

interface BaseTypifiyArgs {
  nodes: Nodes;
  ids: Set<string>;
  config: Config;
}

interface TypifyThingArgs extends BaseTypifiyArgs {
  thing: PrimitiveObject | ArrayObject | ObjectObject;
}

interface TypifyNullArgs extends BaseTypifiyArgs {
  thing: NullObject;
}

interface TypifyBooleanArgs extends BaseTypifiyArgs {
  thing: BooleanObject;
}

interface TypifyNumberArgs extends BaseTypifiyArgs {
  thing: NumberObject;
}

interface TypifyStringArgs extends BaseTypifiyArgs {
  thing: StringObject;
}

interface TypifyArrayArgs extends BaseTypifiyArgs {
  thing: ArrayObject;
}

interface TypifyObjecArgs extends BaseTypifiyArgs {
  thing: ObjectObject;
}

interface ValueByTypeArgs extends BaseTypifiyArgs {
  typeValues: ValuesByType;
}

function getValuesByType({
  typeValues,
  nodes,
  ids,
  config,
}: ValueByTypeArgs): CountedValues {
  const values = Object.keys(typeValues)
    .sort()
    .map(typeName => {
      const nestedThing = typeValues[typeName as JsonTypeStr];
      if (!nestedThing) {
        throw new Error();
      }
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return typifyThing({
        thing: nestedThing,
        nodes,
        ids,
        config,
      });
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
        String(nodes.byPath[node.path].name),
    );
  }

  nodes.byPath[node.path] = node;
}

function typifyNull({ thing, nodes, ids, config }: TypifyNullArgs) {
  const forceType = (config.byPath[thing.path] || {}).forceType === true;
  const baseType = (config.byPath[thing.path] || {}).baseType === true;
  const value = baseType ? thing.type : thing.type;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyString({ thing, nodes, ids, config }: TypifyStringArgs) {
  const forceType = (config.byPath[thing.path] || {}).forceType === true;
  const baseType = (config.byPath[thing.path] || {}).baseType === true;
  const value = baseType
    ? thing.type
    : Array.from(thing.values)
        .sort()
        .map(str => JSON.stringify(str))
        .join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyNumber({ thing, nodes, ids, config }: TypifyNumberArgs) {
  const forceType = (config.byPath[thing.path] || {}).forceType === true;
  const baseType = (config.byPath[thing.path] || {}).baseType === true;
  const value = baseType
    ? thing.type
    : Array.from(thing.values).sort().join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyBoolean({ thing, nodes, ids, config }: TypifyBooleanArgs) {
  const forceType = (config.byPath[thing.path] || {}).forceType === true;
  const baseType = (config.byPath[thing.path] || {}).baseType === true;
  const value = baseType
    ? thing.type
    : Array.from(thing.values).sort().join(' | ');

  if (!forceType) {
    return { count: thing.values.size, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyArray({ thing, nodes, ids, config }: TypifyArrayArgs) {
  const forceType = (config.byPath[thing.path] || {}).forceType === true;
  const values = getValuesByType({
    typeValues: thing.values,
    nodes,
    ids,
    config,
  });

  const value =
    values.count === 0
      ? 'never[]'
      : values.count === 1
      ? `${values.value}[]`
      : `(${values.value})[]`;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `type ${identifier} = ${value};`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function formatKeyname(keyname: string) {
  const obj: any = {};
  Object.defineProperty(obj, keyname, { value: 1, enumerable: true });
  try {
    eval(`obj.${keyname}`);
  } catch (err) {
    return JSON.stringify(keyname);
  }
  return keyname;
}

function typifyObject({ thing, nodes, ids, config }: TypifyObjecArgs) {
  const forceType =
    (config.byPath[thing.path] || {}).forceType === false ? false : true;
  const innerValue = Object.keys(thing.keys)
    .sort()
    .map(keyname => {
      const values = getValuesByType({
        typeValues: thing.keys[keyname].values,
        nodes,
        ids,
        config,
      });

      const formattedKey = formatKeyname(keyname);
      return `${formattedKey}${thing.keys[keyname].optional ? '?' : ''}: ${
        values.value
      };`;
    })
    .join('\n  ');

  const value = `{\n  ${innerValue}\n}`;

  if (!forceType) {
    return { count: 1, value };
  }

  const identifier = uniqueIdentifier(thing, ids, config.typePrefix);
  const stringified = `interface ${identifier} ${value}`;
  const node: Node = {
    name: thing.name,
    identifier,
    path: thing.path,
    stringified,
  };

  addNode(node, nodes);

  return { count: 1, value: identifier };
}

function typifyThing({
  thing,
  nodes,
  ids,
  config,
}: TypifyThingArgs): CountedValues {
  switch (thing.type) {
    case 'null':
      return typifyNull({ thing, nodes, ids, config });

    case 'string':
      return typifyString({ thing, nodes, ids, config });

    case 'number':
      return typifyNumber({ thing, nodes, ids, config });

    case 'boolean':
      return typifyBoolean({ thing, nodes, ids, config });

    case 'array':
      return typifyArray({ thing, nodes, ids, config });

    case 'object':
      return typifyObject({ thing, nodes, ids, config });

    default:
      throw new Error();
  }
}
interface Config {
  maxLiteralPerType?: number;
  byPath: Record<string, { forceType?: boolean; baseType?: boolean }>;
  typePrefix?: string;
}
const baseConfig: Config = {
  maxLiteralPerType: 10,
  byPath: {},
};
const forcedConfig: Config = { byPath: { $: { forceType: true } } };

function typify(
  result: PrimitiveObject | ArrayObject | ObjectObject,
  conf: Config = { byPath: {} },
) {
  const nodes: Nodes = { byPath: {}, byOrder: [] };
  const identifiers = new Set<string>();
  const config: Config = { ...baseConfig, ...conf, ...forcedConfig } as const;
  config.byPath = { ...conf.byPath, ...forcedConfig.byPath } as const;
  typifyThing({
    thing: result,
    nodes,
    ids: identifiers,
    config,
  });

  return nodes.byOrder.map(node => node.stringified).join('\n');
}

export default typify;
