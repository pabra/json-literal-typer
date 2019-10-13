import { PrimitiveObject, ArrayObject, ObjectObject } from './analyze';

function jsonify(
  thingObject: PrimitiveObject | ArrayObject | ObjectObject,
): any {
  if (thingObject.type === 'array') {
    return {
      type: thingObject.type,
      path: thingObject.path,
      values: Object.values(thingObject.values).map(v => jsonify(v)),
    };
  } else if (thingObject.type === 'object') {
    return {
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
  } else {
    const val: Record<string, any> = {
      type: thingObject.type,
      path: thingObject.path,
    };
    if (thingObject.type !== 'null') {
      val.values = [...thingObject.values];
    }
    return val;
  }
}

export default jsonify;
