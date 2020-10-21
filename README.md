# JSON literal typer

[![npm version](https://badge.fury.io/js/json-literal-typer.svg)](https://www.npmjs.com/package/json-literal-typer)
[![unit-tests](https://github.com/pabra/json-literal-typer/workflows/unit-tests/badge.svg?branch=master)](https://github.com/pabra/json-literal-typer/actions?query=branch%3Amaster+workflow%3Aunit-tests)
[![npm-publish](https://github.com/pabra/json-literal-typer/workflows/npm-publish/badge.svg)](https://github.com/pabra/json-literal-typer/actions?query=workflow%3Anpm-publish)
[![codecov](https://codecov.io/gh/pabra/json-literal-typer/branch/master/graph/badge.svg)](https://codecov.io/gh/pabra/json-literal-typer)

There are some tools out there that will produce TypeScript Interfaces from a
given JSON structure for you. But they only give you the basic types (`string`,
`number`, etc.). What if there is an API where you want to get its literal
values/types?

# Install

```bash
# to add to your project
npm install json-literal-typer
# to use command line interface
npm install --global json-literal-typer
```

# Demo

There is a live demo at [https://json-literal-typer.peppnet.de](https://json-literal-typer.peppnet.de)

# Example

Let's assume there is an API for gas stations. It will respond with data like
this:

```json
{
  "stations": [
    { "id": 1, "name": "station A", "status": "OPEN", "attributes": ["fast"] },
    {
      "id": 2,
      "name": "station B",
      "status": "OPEN",
      "attributes": ["fast", "24/7"],
      "operator": "Station Corp."
    },
    {
      "id": 3,
      "name": "station C",
      "status": "CLOSED",
      "attributes": [],
      "operator": "ACME Inc."
    }
  ]
}
```

What you would get from other tools is:

```typescript
interface Station {
  id: number;
  name: string;
  status: string;
  attributes: string[];
  operator?: string;
}
interface RootObject {
  stations: Station[];
}
```

Nice. But what if you could get:

```typescript
interface Stations {
  attributes: ('24/7' | 'fast')[];
  id: 1 | 2 | 3;
  name: 'station A' | 'station B' | 'station C';
  operator?: 'ACME Inc.' | 'Station Corp.';
  status: 'CLOSED' | 'OPEN';
}

interface Root {
  stations: Stations[];
}
```

# CLI

```bash
npm show json-literal-typer versions --json | json-literal-typer
```

# related or inspiring projects

- [json-to-ts] - Convert jsons to typescript interfaces
- [json2ts] - generate TypeScript interfaces from JSON
- [quicktype] - Generate types and converters from JSON, Schema, and GraphQL
- [ts-ast-viewer] - TypeScript AST viewer

[json-to-ts]: https://github.com/MariusAlch/json-to-ts
[json2ts]: http://www.json2ts.com/
[quicktype]: https://github.com/quicktype/quicktype
[ts-ast-viewer]: https://github.com/dsherret/ts-ast-viewer
