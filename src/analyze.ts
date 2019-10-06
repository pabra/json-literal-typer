type JsonPrimitive = boolean | null | number | string;
type JsonArray = unknown[];
type JsonObject = Record<string, unknown>;
type JsonTypeStr =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'null'
  | 'array';

interface TypeObject {
  readonly type: JsonTypeStr;
  readonly name: string;
}

interface StringObject extends TypeObject {
  readonly type: 'string';
  readonly values: Set<string>;
}

interface NumberObject extends TypeObject {
  readonly type: 'number';
  readonly values: Set<number>;
}

interface BooleanObject extends TypeObject {
  readonly type: 'boolean';
  readonly values: Set<boolean>;
}

interface NullObject extends TypeObject {
  readonly type: 'null';
}

type PrimitiveObject = StringObject | NumberObject | BooleanObject | NullObject;

interface ValuesByType {
  string?: StringObject;
  number?: NumberObject;
  boolean?: BooleanObject;
  null?: NullObject;
  array?: ArrayObject;
  object?: ObjectObject;
}

interface ArrayObject extends TypeObject {
  readonly type: 'array';
  readonly values: ValuesByType;
}

interface ObjectObject extends TypeObject {
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

function getObjectFromParent(
  parent: null | PrimitiveObject | ArrayObject | ObjectObject,
  typeName: JsonTypeStr,
  name: string,
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
    return parent.keys[name].values[typeName]
      ? (parent.keys[name].values[typeName] as ObjectObject)
      : null;
  }

  return null;
}

function inspectPrimitive(
  value: JsonPrimitive,
  parent: null | ArrayObject | ObjectObject,
  name: string,
) {
  if (isNull(value)) {
    return (
      getObjectFromParent(parent, 'null', name) ||
      ({ type: 'null', name } as NullObject)
    );
  }

  if (isString(value)) {
    const stringObject: StringObject = (getObjectFromParent(
      parent,
      'string',
      name,
    ) as StringObject) || { type: 'string', name, values: new Set() };
    stringObject.values.add(value);
    return stringObject;
  }

  if (isNumber(value)) {
    const numberObject: NumberObject = (getObjectFromParent(
      parent,
      'number',
      name,
    ) as NumberObject) || { type: 'number', name, values: new Set() };
    numberObject.values.add(value);
    return numberObject;
  }

  if (isBoolean(value)) {
    const booleanObject: BooleanObject = (getObjectFromParent(
      parent,
      'boolean',
      name,
    ) as BooleanObject) || { type: 'boolean', name, values: new Set() };
    booleanObject.values.add(value);
    return booleanObject;
  }

  throw new Error('no JSON primitive type');
}

function inspectArray(
  value: JsonArray,
  parent: null | ArrayObject | ObjectObject,
  name: string,
) {
  const typeObject =
    (getObjectFromParent(parent, 'array', name) as null | ArrayObject) ||
    ({ type: 'array', name, values: {} } as ArrayObject);

  value.forEach(v => {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const childObject = inspect(v, typeObject, name);
    if (!childObject) {
      throw new Error();
    }
    if (childObject.type === 'string') {
      typeObject.values.string = childObject;
    } else if (childObject.type === 'null') {
      typeObject.values.null = childObject;
    } else if (childObject.type === 'number') {
      typeObject.values.number = childObject;
    } else if (childObject.type === 'boolean') {
      typeObject.values.boolean = childObject;
    } else if (childObject.type === 'array') {
      typeObject.values.array = childObject;
    } else if (childObject.type === 'object') {
      typeObject.values.object = childObject;
    }
  });

  return typeObject;
}

function inspectObject(
  value: JsonObject,
  parent: null | ArrayObject | ObjectObject,
  name: string,
) {
  const typeObject =
    (getObjectFromParent(parent, 'object', name) as null | ObjectObject) ||
    ({ type: 'object', name, keys: {} } as ObjectObject);

  Object.entries(value).forEach(([childKey, childValue]) => {
    if (!Object.prototype.hasOwnProperty.call(typeObject.keys, childKey)) {
      typeObject.keys[childKey] = { values: {} };
    }
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const childObject = inspect(childValue, typeObject, childKey);
    if (!childObject) {
      throw new Error();
    }

    if (childObject.type === 'string') {
      typeObject.keys[childKey].values.string = childObject;
    } else if (childObject.type === 'null') {
      typeObject.keys[childKey].values.null = childObject;
    } else if (childObject.type === 'number') {
      typeObject.keys[childKey].values.number = childObject;
    } else if (childObject.type === 'boolean') {
      typeObject.keys[childKey].values.boolean = childObject;
    } else if (childObject.type === 'array') {
      typeObject.keys[childKey].values.array = childObject;
    } else if (childObject.type === 'object') {
      typeObject.keys[childKey].values.object = childObject;
    }
  });

  return typeObject;
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
  name: string,
): ArrayObject | ObjectObject | PrimitiveObject {
  let inspectedObject: PrimitiveObject | ArrayObject | ObjectObject;
  if (isPrimitive(thing)) {
    inspectedObject = inspectPrimitive(thing, parent, name);
  } else if (isArray(thing)) {
    inspectedObject = inspectArray(thing, parent, name);
  } else if (isObject(thing)) {
    inspectedObject = inspectObject(thing, parent, name);
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

export default inspect;
export {
  NullObject,
  BooleanObject,
  StringObject,
  NumberObject,
  PrimitiveObject,
  ArrayObject,
  ObjectObject,
  ValuesByType,
  JsonTypeStr,
};
