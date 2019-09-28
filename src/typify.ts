import * as ts from 'typescript';

import {
  ValuesByType,
  PrimitiveObject,
  ArrayObject,
  ObjectObject,
} from './analyze';

function uniqueIdentifier(name: string, identifiers: Set<string>) {
  const capitalizedName = name.substr(0, 1).toUpperCase() + name.substr(1);
  let testName = capitalizedName;
  let i = 2;

  while (identifiers.has(testName)) {
    testName = `${capitalizedName}${i++}`;
  }

  return testName;
}

type TaggedNodes =
  | { type: 'union'; data: ts.UnionTypeNode }
  | {
      type: 'single';
      data:
        | ts.TypeReferenceNode
        | ts.ArrayTypeNode
        | ts.LiteralTypeNode
        | ts.NullLiteral;
    };

function typifyValuesByType(
  typeValues: ValuesByType,
  name: string,
  arrayOfNodes: ts.InterfaceDeclaration[],
  ids: Set<string>,
) {
  const typeNodes = Object.values(typeValues).map(
    (tv: PrimitiveObject | ArrayObject | ObjectObject) =>
      typifyThing(tv, name, arrayOfNodes, ids).data, // eslint-disable-line @typescript-eslint/no-use-before-define
  );
  switch (typeNodes.length) {
    case 0:
      return null;
    case 1:
      return { type: 'single', data: typeNodes[0] };
    default:
      return { type: 'union', data: ts.createUnionTypeNode(typeNodes) };
  }
}

function typifyThing(
  thing: PrimitiveObject | ArrayObject | ObjectObject,
  name: string,
  arrayOfNodes: ts.InterfaceDeclaration[],
  ids: Set<string>,
): TaggedNodes {
  let nodes: ts.LiteralTypeNode[];
  if (thing.type === 'null') {
    return { type: 'single', data: ts.createNull() };
  } else if (thing.type === 'string') {
    nodes = Array.from(thing.values)
      .sort()
      .map(str => ts.createLiteralTypeNode(ts.createStringLiteral(str)));
    return nodes.length > 1
      ? { type: 'union', data: ts.createUnionTypeNode(nodes) }
      : { type: 'single', data: nodes[0] };
  } else if (thing.type === 'number') {
    nodes = Array.from(thing.values)
      .sort()
      .map(num =>
        ts.createLiteralTypeNode(ts.createNumericLiteral(String(num))),
      );
    return nodes.length > 1
      ? { type: 'union', data: ts.createUnionTypeNode(nodes) }
      : { type: 'single', data: nodes[0] };
  } else if (thing.type === 'boolean') {
    nodes = Array.from(thing.values)
      .sort()
      .map(bool =>
        ts.createLiteralTypeNode(
          bool === true ? ts.createTrue() : ts.createFalse(),
        ),
      );
    return nodes.length > 1
      ? { type: 'union', data: ts.createUnionTypeNode(nodes) }
      : { type: 'single', data: nodes[0] };
  } else if (thing.type === 'array') {
    const typifiedValues = typifyValuesByType(
      thing.values,
      name,
      arrayOfNodes,
      ids,
    );
    const arrayNodes =
      typifiedValues === null
        ? ts.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword)
        : typifiedValues.type === 'union'
        ? ts.createParenthesizedType(typifiedValues.data)
        : typifiedValues.data;
    return { type: 'single', data: ts.createArrayTypeNode(arrayNodes) };
  } else if (thing.type === 'object') {
    const uniqueName = uniqueIdentifier(name, ids);
    const identifier = ts.createIdentifier(uniqueName);

    const inter = ts.createInterfaceDeclaration(
      undefined,
      undefined,
      identifier,
      undefined,
      undefined,
      Object.keys(thing.keys)
        .sort()
        .map(key => {
          const data = thing.keys[key];
          const typifiedValues = typifyValuesByType(
            data.values,
            key,
            arrayOfNodes,
            ids,
          );

          return ts.createPropertySignature(
            undefined,
            ts.createIdentifier(key),
            data.optional
              ? ts.createToken(ts.SyntaxKind.QuestionToken)
              : undefined,
            typifiedValues === null
              ? ts.createTypeLiteralNode([])
              : typifiedValues.data,
            undefined,
          );
        }),
    );

    arrayOfNodes.push(inter);

    return {
      type: 'single',
      data: ts.createTypeReferenceNode(identifier, undefined),
    };
  } else {
    throw new Error();
  }
}

function typify(result: PrimitiveObject | ArrayObject | ObjectObject) {
  const arrayOfNodes: ts.InterfaceDeclaration[] = [];
  const identifiers = new Set<string>();
  typifyThing(result, 'root', arrayOfNodes, identifiers);
  const nodeArray = ts.createNodeArray(arrayOfNodes);

  const resultFile = ts.createSourceFile(
    'someFileName.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS,
  );
  const printer = ts.createPrinter();

  const res = printer.printList(ts.ListFormat.MultiLine, nodeArray, resultFile);

  return res;
}

export default typify;
