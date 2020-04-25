type JsonPrimitive = boolean | null | number | string;
type JsonArray = unknown[];
type JsonObject = Record<string, unknown>;
export type JsonTypeStr =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'null'
  | 'array';

const arrayMember = Symbol('array member');

export type ArrayMember = typeof arrayMember;

interface TypeObject {
  readonly type: JsonTypeStr;
  readonly name: string | ArrayMember;
  readonly parent: null | ArrayObject | ObjectObject;
  readonly path: string;
}

export interface StringObject extends TypeObject {
  readonly type: 'string';
  readonly values: Set<string>;
}

export interface NumberObject extends TypeObject {
  readonly type: 'number';
  readonly values: Set<number>;
}

export interface BooleanObject extends TypeObject {
  readonly type: 'boolean';
  readonly values: Set<boolean>;
}

export interface NullObject extends TypeObject {
  readonly type: 'null';
}

export type PrimitiveObject =
  | StringObject
  | NumberObject
  | BooleanObject
  | NullObject;

export interface ValuesByType {
  string?: StringObject;
  number?: NumberObject;
  boolean?: BooleanObject;
  null?: NullObject;
  array?: ArrayObject;
  object?: ObjectObject;
}

export interface ArrayObject extends TypeObject {
  readonly type: 'array';
  readonly values: ValuesByType;
}

export interface ObjectObject extends TypeObject {
  readonly type: 'object';
  readonly keys: {
    [key: string]: {
      readonly values: ValuesByType;
      optional?: true;
    };
  };
}

function isNull(value: unknown): value is null {
  return value === null;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isPrimitive(value: unknown): value is JsonPrimitive {
  return (
    isNull(value) || isBoolean(value) || isNumber(value) || isString(value)
  );
}

function isArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

function isObject(value: unknown): value is JsonObject {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function quoteName(name: string | ArrayMember) {
  return typeof name === 'string' ? `'${name}'` : '*';
}

function getObjectFromParent(
  parent: null | ArrayObject | ObjectObject,
  typeName: JsonTypeStr,
  name: string | ArrayMember,
) {
  if (parent === null) {
    return null;
  }

  if (parent.type === 'array') {
    return parent.values[typeName]
      ? (parent.values[typeName] as (
          | PrimitiveObject
          | ArrayObject
          | ObjectObject))
      : null;
  }

  if (parent.type === 'object') {
    if (typeof name !== 'string') {
      throw new Error('object key must be string');
    }
    return parent.keys[name].values[typeName]
      ? (parent.keys[name].values[typeName] as ObjectObject)
      : null;
  }

  return null;
}

function inspectPrimitive(
  value: JsonPrimitive,
  parent: null | ArrayObject | ObjectObject,
  name: string | ArrayMember,
  path: string,
) {
  if (isNull(value)) {
    const parentNullObj = getObjectFromParent(
      parent,
      'null',
      name,
    ) as null | NullObject;
    const newNullObj: NullObject = {
      type: 'null',
      name,
      parent,
      path: parent === null ? path : `${path}[${quoteName(name)}]{null}`,
    } as const;

    return parentNullObj === null ? newNullObj : parentNullObj;
  }

  if (isString(value)) {
    const parentStringObj = getObjectFromParent(
      parent,
      'string',
      name,
    ) as null | StringObject;
    const newStringObj: StringObject = {
      type: 'string',
      name,
      parent,
      path: parent === null ? path : `${path}[${quoteName(name)}]{string}`,
      values: new Set(),
    };
    const stringObject =
      parentStringObj === null ? newStringObj : parentStringObj;
    stringObject.values.add(value);

    return stringObject;
  }

  if (isNumber(value)) {
    const parentnumberObj = getObjectFromParent(
      parent,
      'number',
      name,
    ) as null | NumberObject;
    const newNumberObj: NumberObject = {
      type: 'number',
      name,
      parent,
      path: parent === null ? path : `${path}[${quoteName(name)}]{number}`,
      values: new Set(),
    };
    const numberObject =
      parentnumberObj === null ? newNumberObj : parentnumberObj;
    numberObject.values.add(value);

    return numberObject;
  }

  if (isBoolean(value)) {
    const parentBoolObj = getObjectFromParent(
      parent,
      'boolean',
      name,
    ) as null | BooleanObject;
    const newBoolObj: BooleanObject = {
      type: 'boolean',
      name,
      parent,
      path: parent === null ? path : `${path}[${quoteName(name)}]{boolean}`,
      values: new Set(),
    };
    const booleanObject = parentBoolObj === null ? newBoolObj : parentBoolObj;
    booleanObject.values.add(value);

    return booleanObject;
  }

  throw new Error('no JSON primitive type');
}

function inspectArray(
  value: JsonArray,
  parent: null | ArrayObject | ObjectObject,
  name: string | ArrayMember,
  path: string,
) {
  const parentArrObj = getObjectFromParent(
    parent,
    'array',
    name,
  ) as null | ArrayObject;
  const newArrObj: ArrayObject = {
    type: 'array',
    name,
    parent,
    path: parent === null ? path : `${path}[${quoteName(name)}]{array}`,
    values: {},
  };
  const arrayObject = parentArrObj === null ? newArrObj : parentArrObj;

  value.forEach(v => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const childObject = inspect(v, arrayObject, arrayMember, arrayObject.path);
    if (!childObject) {
      throw new Error();
    }
    if (childObject.type === 'string') {
      arrayObject.values.string = childObject;
    } else if (childObject.type === 'null') {
      arrayObject.values.null = childObject;
    } else if (childObject.type === 'number') {
      arrayObject.values.number = childObject;
    } else if (childObject.type === 'boolean') {
      arrayObject.values.boolean = childObject;
    } else if (childObject.type === 'array') {
      arrayObject.values.array = childObject;
    } else if (childObject.type === 'object') {
      arrayObject.values.object = childObject;
    }
  });

  return arrayObject;
}

function inspectObject(
  value: JsonObject,
  parent: null | ArrayObject | ObjectObject,
  name: string | ArrayMember,
  path: string,
) {
  const parentObjObj = getObjectFromParent(
    parent,
    'object',
    name,
  ) as null | ObjectObject;
  const newObjObj: ObjectObject = {
    type: 'object',
    name,
    parent,
    path: parent === null ? path : `${path}[${quoteName(name)}]{object}`,
    keys: {},
  };
  const objectObject = parentObjObj === null ? newObjObj : parentObjObj;

  Object.entries(value).forEach(([childKey, childValue]) => {
    if (!Object.prototype.hasOwnProperty.call(objectObject.keys, childKey)) {
      objectObject.keys[childKey] = { values: {} };
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const childObject = inspect(
      childValue,
      objectObject,
      childKey,
      objectObject.path,
    );
    if (!childObject) {
      throw new Error();
    }

    if (childObject.type === 'string') {
      objectObject.keys[childKey].values.string = childObject;
    } else if (childObject.type === 'null') {
      objectObject.keys[childKey].values.null = childObject;
    } else if (childObject.type === 'number') {
      objectObject.keys[childKey].values.number = childObject;
    } else if (childObject.type === 'boolean') {
      objectObject.keys[childKey].values.boolean = childObject;
    } else if (childObject.type === 'array') {
      objectObject.keys[childKey].values.array = childObject;
    } else if (childObject.type === 'object') {
      objectObject.keys[childKey].values.object = childObject;
    }
  });

  return objectObject;
}

function markOptional(
  thing: unknown,
  inspectedObject: PrimitiveObject | ArrayObject | ObjectObject,
) {
  if (isArray(thing)) {
    if (inspectedObject.type !== 'array') {
      throw new Error('expected to be ArrayObject');
    }

    thing.forEach(childThing => {
      if (isArray(childThing)) {
        markOptional(childThing, inspectedObject.values.array as ArrayObject);
      } else if (isObject(childThing)) {
        markOptional(childThing, inspectedObject.values.object as ObjectObject);
      }
    });
  } else if (isObject(thing)) {
    if (inspectedObject.type !== 'object') {
      throw new Error('expected to be ObjectObject');
    }
    const keysInThing = Object.keys(thing);
    Object.entries(inspectedObject.keys).forEach(
      ([inspChildKey, inspChildObject]) => {
        if (!keysInThing.includes(inspChildKey)) {
          inspChildObject.optional = true;
        }
      },
    );

    Object.entries(thing).forEach(([childKey, childThing]) => {
      if (isArray(childThing)) {
        markOptional(childThing, inspectedObject.keys[childKey].values
          .array as ArrayObject);
      } else if (isObject(childThing)) {
        markOptional(childThing, inspectedObject.keys[childKey].values
          .object as ObjectObject);
      }
    });
  }

  return inspectedObject;
}

function inspect(
  thing: unknown,
  parent: null | ArrayObject | ObjectObject,
  name: string | ArrayMember,
  path: string,
): ArrayObject | ObjectObject | PrimitiveObject {
  let inspectedObject: PrimitiveObject | ArrayObject | ObjectObject;
  if (isPrimitive(thing)) {
    inspectedObject = inspectPrimitive(thing, parent, name, path);
  } else if (isArray(thing)) {
    inspectedObject = inspectArray(thing, parent, name, path);
  } else if (isObject(thing)) {
    inspectedObject = inspectObject(thing, parent, name, path);
  } else {
    throw new Error(
      `unexpected type "${typeof thing}" ("${Object.prototype.toString.call(
        thing,
      )}") of value "${thing}"`,
    );
  }

  if (parent === null) {
    return markOptional(thing, inspectedObject);
  }

  return inspectedObject;
}

function analyze(thing: unknown) {
  return inspect(thing, null, 'root', '$');
}

export default analyze;
