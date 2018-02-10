# mpc-med-client
User-facing client interface for data harmonization.

## Generating json schema
Follow install instructions [here](https://github.com/nijikokun/generate-schema#installation)

```
var GenerateSchema = require('generate-schema')`

function generate_schema(json_data){
  var schema = GenerateSchema.json('example-mpc-med-data', json_data);
  // do something with schema
}
```
