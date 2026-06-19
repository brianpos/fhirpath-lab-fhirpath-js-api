# FHIR Path Azure Function API

A Node.js TypeScript Azure Functions API for experimenting with FHIRPath expressions using the `@reasonhealth/fhirpath` WASM implementation.
Specifically it implements the API defined to run with the Fhirpath-lab:
> https://github.com/brianpos/fhirpath-lab/blob/master/server-api.md

## Overview

This project provides a minimal Azure Functions HTTP API that evaluates FHIRPath expressions against FHIR resources. It uses the **Reason Health FHIRPath WebAssembly implementation** (`@reasonhealth/fhirpath`) which provides a performant Rust-based FHIRPath engine compiled to WebAssembly.

### Key Features

- **WASM-based FHIRPath Engine**: Fast, reliable FHIRPath evaluation using Rust + WebAssembly
- **Azure Functions HTTP API**: Minimal serverless endpoint surface for FHIRPath evaluation
- **FHIR Parameters Format**: Standard FHIR Parameters resource for input/output
- **Expression Parsing**: Parse FHIRPath expressions to get AST
- **Error Handling**: Proper FHIR OperationOutcome responses for errors
- **Variable Support**: FHIRPath environment variables with escape sequence handling
- **TypeScript**: Full TypeScript implementation with proper type definitions

## Project Structure

```
src/
├── index.ts                # Azure Functions HTTP triggers and routes
├── fhirpath-service.ts     # FHIRPath evaluation logic
├── utils.ts                # Utility functions (OperationOutcome creation)
├── debug-tracer.ts         # Debug utilities and formatting
└── types.d.ts              # TypeScript definitions
host.json                   # Azure Functions host configuration
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the TypeScript code:
   ```bash
   npm run build
   ```

3. Start the local Functions host:
   ```bash
   npm run dev
   ```

4. Or start the local Functions host via the default script:
   ```bash
   npm start
   ```

The local host will run on `http://localhost:7071` by default and requires Azure Functions Core Tools.

## API Endpoints

### GET /lab-config
Returns the static FHIRPath Lab configuration for the R5 endpoint.

### POST /$rust-r5
Evaluates a FHIRPath expression against provided FHIR data.

**Request Body (FHIR Parameters resource):**
```json
{
  "resourceType": "Parameters",
  "parameter": [
   {
     "name": "expression",
     "valueString": "Patient.name.given"
   },
   {
     "name": "resource",
     "resource": {
       "resourceType": "Patient",
       "name": [
         {
           "given": ["John"],
           "family": "Doe"
         }
       ]
     }
   },
   {
     "name": "variables",
     "part": [
       {
         "name": "myVar",
         "valueString": "example"
       }
     ]
   }
  ]
}
```

**Parameters:**
- **expression** (required): FHIRPath expression to evaluate
- **resource** (required): FHIR resource to evaluate against
- **variables** (optional): Environment variables for FHIRPath evaluation with escape sequence support

**Response (FHIR Parameters resource):**
```json
{
  "resourceType": "Parameters",
  "parameter": [
   {
     "name": "parameters",
     "part": [
       {
         "name": "evaluator",
         "valueString": "@reasonhealth/fhirpath-0.2.0 (wasm)"
       },
       {
         "name": "expression",
         "valueString": "Patient.name.given"
       },
       {
         "name": "parseDebugTree",
         "valueString": "{ ... }"
       },
       {
         "name": "parseDebugTreeJs",
         "valueString": "{ ... }"
       }
     ]
   },
   {
     "name": "result",
     "part": [
       {
         "name": "string",
         "valueString": "John"
        }
      ]
   },
   {
     "name": "debug-trace",
     "part": []
   }
  ]
}
```

The response includes:
- **parseDebugTree**: Transformed AST for FHIRPath Lab integration
- **parseDebugTreeJs**: WASM engine AST
- **debug-trace**: Empty for WASM engine (tracing not available)

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Build and start the local Azure Functions host
- `npm run dev` - Build and start the local Azure Functions host
- `npm run watch` - Watch for TypeScript changes and recompile

## Local Development Notes

- Azure Functions Core Tools are required to run `npm start` or `npm run dev`.
- `host.json` removes the default `/api` prefix so the local endpoints are exactly `/$rust-r5` and `/lab-config`.
- The included `config.rust.json` points the lab at `http://localhost:7071/$rust-r5`.

## Architecture Notes

The project follows a clean separation of concerns:

- **index.ts**: Azure Functions route registration and HTTP request handling
- **fhirpath-service.ts**: Core FHIRPath evaluation logic and request processing
- **utils.ts**: Utility functions for FHIR operations (OperationOutcome creation, parameter value population)
- **debug-tracer.ts**: Debug utilities and formatting system
- **types.d.ts**: TypeScript definitions

This modular structure makes the code:
- Easy to test (business logic separated from HTTP concerns)
- Maintainable (clear responsibilities for each module)
- Extensible (easy to add new endpoints or operations)
- Testable (transport-neutral evaluator logic behind the HTTP trigger)

## Using the WASM FHIRPath Engine

This project uses the Reason Health FHIRPath WASM package (`@reasonhealth/fhirpath`). Key aspects:

### Why WASM?
- **Performance**: Compiled Rust code runs much faster than JavaScript
- **Reliability**: Rust's type system ensures safety
- **Future-proof**: Can benefit from Rust ecosystem improvements

### API Usage

The service uses three main functions from the WASM engine:

```typescript
import { evaluateExpression, parseExpression, version } from "@reasonhealth/fhirpath";

// Get version string
const ver = version(); // e.g., "0.2.0"

// Parse a FHIRPath expression to get AST
const parseResult = parseExpression("Patient.name.given", { format: 'json' });
if (parseResult.success) {
  const ast = parseResult.value;
}

// Evaluate a FHIRPath expression against a resource
const evalResult = evaluateExpression(
  "Patient.name.given",
  patientResource,
  { format: 'json' }
);
if (evalResult.success) {
  const results = evalResult.value;
}
```

### Result Format

The WASM engine returns results wrapped in an object:
```typescript
{
  success: boolean,
  value?: {
   result: any[],      // Array of results
   count: number,      // Number of results
   trace: any[],       // Trace information (if available)
   type: string        // Type indicator (e.g., 'collection', 'single_value')
  },
  error?: string        // Error message if success is false
}
```

## Examples

See [examples.md](./examples.md) for detailed curl examples of:
- Simple property access
- Filtering with where clauses
- Function evaluation
- Boolean expressions
- Complex resources
- Variable support
- Error handling

## Running Examples

A demo script is provided to test various expressions:

```bash
# Run all examples
bash demo.sh

# Run a specific example (1-8)
bash demo.sh 1
```

## Dependencies

### Runtime Dependencies
- **express**: Web framework for Node.js (v5.1.0+)
- **@reasonhealth/fhirpath**: WASM-based FHIRPath engine (v0.2.0+)
- **fhirpath**: Original JavaScript implementation (kept for compatibility)
- **cors**: Enable CORS for cross-origin requests
- **@types/fhir**: TypeScript types for FHIR resources

### Development Dependencies
- **typescript**: TypeScript compiler and tooling
- **ts-node-dev**: Development tool with TypeScript support and auto-restart
- **@types/express**: TypeScript definitions for Express
- **@types/cors**: TypeScript definitions for CORS
- **@types/node**: TypeScript definitions for Node.js

## Migration Notes

This project was updated to use the `@reasonhealth/fhirpath` WASM engine instead of the JavaScript-based `fhirpath` package. 

### Key Changes:
1. **Evaluator String**: Changed from `fhirpath.js-X.X.X (r5)` to `@reasonhealth/fhirpath-X.X.X (wasm)`
2. **Result Handling**: WASM engine returns results wrapped in an object with `result`, `count`, `trace`, and `type` properties
3. **Performance**: WASM implementation is typically 2-10x faster for complex expressions
4. **Debug Trace**: Advanced tracing features not available with WASM (debug-trace returns empty)

### API Compatibility:
The REST API remains fully compatible. Request/response formats are identical, ensuring seamless migration for clients.
