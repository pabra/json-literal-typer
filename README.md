# JSON literal typer

There are some tools out there that will produce TypeScript Interfaces from a
given JSON structure for you. But they only give you the basic types (`sting`,
`number`, etc.). What if there is an API where you want to get its literal
values/types?

# Demo

There is a live demo at [https://json-literal-typer.peppnet.de](https://json-literal-typer.peppnet.de)

# Example

Let's assume there is an API for gas stations. It will respond with data like
this:

```json
{
  "stations": [
    { "id": 1, "name": "station A", "status": "OPEN", "attibutes": ["fast"] },
    {
      "id": 2,
      "name": "station B",
      "status": "OPEN",
      "attibutes": ["fast", "24/7"],
      "operator": "Station Corp."
    },
    {
      "id": 3,
      "name": "station C",
      "status": "CLOSED",
      "attibutes": [],
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
  attibutes: string[];
  operator?: string;
}
interface RootObject {
  stations: Station[];
}
```

Nice. But what if you could get:

```typescript
interface Stations {
  attibutes: ('24/7' | 'fast')[];
  id: 1 | 2 | 3;
  name: 'station A' | 'station B' | 'station C';
  operator?: 'ACME Inc.' | 'Station Corp.';
  status: 'CLOSED' | 'OPEN';
}
interface Root {
  stations: Stations[];
}
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
