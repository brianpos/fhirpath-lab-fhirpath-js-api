# FHIR Path JS API

A Node.js TypeScript API server for experimenting with FHIRPath expressions using the `fhirpath` npm package.
Specifically it implements the API defined to run with the Fhirpath-lab:
> https://github.com/brianpos/fhirpath-lab/blob/master/server-api.md

## Project Structure

```
src/
├── index.ts           # Main Express server and routes
├── fhirpath-service.ts # FHIRPath evaluation logic
├── utils.ts           # Utility functions (OperationOutcome creation)
├── debug-tracer.ts    # Advanced FHIRPath expression debugging and tracing
└── types.d.ts         # TypeScript definitions extending the fhirpath library
.vscode/
└── launch.json        # VS Code debugging configurations
.github/
└── copilot-instructions.md # AI coding agent instructions
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
          "valueString": "fhirpath.js-4.5.1 (r5)"
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
      "part": [
        {
          "name": "0,19,Patient.name.given",
          "part": [
            {
              "name": "string",
              "valueString": "John"
            }
          ]
        }
      ]
    }
  ]
}
```

The response includes:
- **parseDebugTree**: Transformed AST for FHIRPath Lab integration
- **parseDebugTreeJs**: Raw fhirpath.js AST
- **debug-trace**: Detailed execution trace with focus variables and results

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run dev:debug` - Start development server with debugging enabled
- `npm run watch` - Watch for TypeScript changes and recompile

## Debugging in VS Code

The project includes three VS Code launch configurations for debugging:

1. **"Debug API Server"** - Builds TypeScript first, then debugs the compiled JavaScript
   - Most reliable for breakpoints
   - Uses source maps for TypeScript debugging

2. **"Debug with ts-node"** - Debugs TypeScript directly using ts-node/register
   - Faster startup (no build step)
   - Enhanced source map configuration for better breakpoint support

3. **"Debug with ts-node-dev"** - Uses npm run dev:debug with inspect mode
   - Auto-restart on file changes during debugging
   - Good for iterative development

### Setting Port for Debugging
All debug configurations use port 3001 by default. You can change this in the launch.json file or by setting the PORT environment variable.

### Debugging Tips
- If breakpoints aren't working with ts-node configurations, try the "Debug API Server" option
- Use `debugger;` statements in your code as an alternative to breakpoints
- Console.log statements will appear in the VS Code integrated terminal

## Project Features

- **Modular Architecture**: Separated concerns with dedicated service modules
- **TypeScript Support**: Full TypeScript implementation with proper type definitions
- **FHIR R5 Support**: Uses FHIR R5 model for FHIRPath evaluation
- **Advanced Debug Tracing**: Sophisticated FHIRPath expression debugging with execution traces
- **AST Processing**: Custom AST transformation for FHIRPath Lab integration
- **Variable Support**: FHIRPath environment variables with escape sequence handling
- **Comprehensive Logging**: Debug logging for request processing and FHIRPath evaluation
- **Error Handling**: Proper FHIR OperationOutcome responses for errors
- **VS Code Integration**: Multiple debugging configurations for different development needs
- **FHIR Content Types**: Support for both application/json and application/fhir+json

## Dependencies

### Runtime Dependencies
- **express**: Web framework for Node.js (v5.1.0+)
- **fhirpath**: FHIRPath implementation for JavaScript (v4.5.1+)
- **cors**: Enable CORS for cross-origin requests
- **@types/fhir**: TypeScript types for FHIR resources

### Development Dependencies
- **typescript**: TypeScript compiler and tooling
- **ts-node-dev**: Development tool with TypeScript support and auto-restart
- **@types/express**: TypeScript definitions for Express
- **@types/cors**: TypeScript definitions for CORS
- **@types/node**: TypeScript definitions for Node.js

## Architecture Notes

The project follows a clean separation of concerns:

- **index.ts**: Express server setup, middleware, and route definitions
- **fhirpath-service.ts**: Core FHIRPath evaluation logic and request processing
- **utils.ts**: Utility functions for FHIR operations (OperationOutcome creation, parameter value population)
- **debug-tracer.ts**: Advanced FHIRPath expression debugging and tracing system
- **types.d.ts**: TypeScript definitions extending the fhirpath library

This modular structure makes the code:
- Easy to test (business logic separated from HTTP concerns)
- Maintainable (clear responsibilities for each module)
- Extensible (easy to add new FHIRPath operations or endpoints)
- Debuggable (comprehensive tracing and AST analysis capabilities)
