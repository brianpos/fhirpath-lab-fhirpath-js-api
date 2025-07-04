# FHIR Path JS API

A Node.js TypeScript API server for experimenting with FHIRPath expressions using the `fhirpath` npm package.

## Project Structure

```
src/
├── index.ts           # Main Express server and routes
├── fhirpath-service.ts # FHIRPath evaluation logic
├── types.ts           # TypeScript type definitions
└── utils.ts           # Utility functions (OperationOutcome creation)
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

3. Start the development server (with auto-reload):
   ```bash
   npm run dev
   ```

4. Or start the production server:
   ```bash
   npm start
   ```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### GET /
Returns basic information about the API and available endpoints.

### GET /health
Health check endpoint.

### POST /$fhirpath-r5
Evaluates a FHIRPath expression against provided FHIR data using FHIR R5 model.

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
    }
  ]
}
```

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
          "valueString": "fhirpath.js-4.5.0 (r5)"
        },
        {
          "name": "expression",
          "valueString": "Patient.name.given"
        },
        {
          "name": "resource",
          "resource": { ... }
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
    }
  ]
}
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run watch` - Watch for TypeScript changes and recompile

## Debugging in VS Code

The project includes VS Code launch configurations for debugging:
- **Debug API Server**: Builds and debugs the compiled JavaScript
- **Debug with ts-node**: Debugs TypeScript directly without compilation

## Dependencies

- **express**: Web framework for Node.js
- **fhirpath**: FHIRPath implementation for JavaScript
- **cors**: Enable CORS for cross-origin requests
- **@types/fhir**: TypeScript types for FHIR resources
- **typescript**: TypeScript compiler and tooling
- **ts-node-dev**: Development tool with TypeScript support and auto-restart
