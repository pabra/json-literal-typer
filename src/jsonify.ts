import { PrimitiveObject, ArrayObject, ObjectObject } from './analyze';

interface ArrayJson {
  type: 'array';
  path: string;
  values: {};
}

interface ObjectJson {
  type: 'object';
  path: string;
  keys: Record<string, {}>;
}

interface NullJson {
  type: 'null';
  path: string;
}

interface BooleanJson {
  type: 'boolean';
  path: string;
  values: (true | false)[];
}

interface NumberJson {
  type: 'number';
  path: string;
  values: number[];
}

interface StringJson {
  type: 'string';
  path: string;
  values: string[];
}

function jsonify(thingObject: PrimitiveObject | ArrayObject | ObjectObject) {
  if (thingObject.type === 'array') {
    const arrayJson: ArrayJson = {
      type: thingObject.type,
      path: thingObject.path,
      values: Object.values(thingObject.values).map(v => jsonify(v)),
    };

    return arrayJson;
  } else if (thingObject.type === 'object') {
    const objectJson: ObjectJson = {
      type: thingObject.type,
      path: thingObject.path,
      keys: Object.entries(thingObject.keys).reduce<Record<string, any>>(
        (acc, [key, valuesObj]) => {
          const values: Record<string, any> = {
            values: Object.values(valuesObj.values).map(v => jsonify(v)),
          };
          if (valuesObj.optional) {
            values.optional = valuesObj.optional;
          }
          acc[key] = values;
          return acc;
        },
        {},
      ),
    };

    return objectJson;
  } else if (thingObject.type === 'null') {
    const nullJson: NullJson = {
      type: thingObject.type,
      path: thingObject.path,
    };

    return nullJson;
  } else if (thingObject.type === 'boolean') {
    const booleanJson: BooleanJson = {
      type: thingObject.type,
      path: thingObject.path,
      values: [...thingObject.values],
    };

    return booleanJson;
  } else if (thingObject.type === 'number') {
    const numberJson: NumberJson = {
      type: thingObject.type,
      path: thingObject.path,
      values: [...thingObject.values],
    };

    return numberJson;
  } else if (thingObject.type === 'string') {
    const stringJson: StringJson = {
      type: thingObject.type,
      path: thingObject.path,
      values: [...thingObject.values],
    };

    return stringJson;
  }

  throw new Error();
}

export default jsonify;
