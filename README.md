# FHIR Path JS API

A Node.js TypeScript API server for experimenting with FHIRPath expressions using the `fhirpath` npm package.

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

### POST /fhirpath
Evaluates a FHIRPath expression against provided FHIR data.

**Request Body:**
```json
{
  "expression": "name.given",
  "data": {
    "resourceType": "Patient",
    "name": [
      {
        "given": ["John"],
        "family": "Doe"
      }
    ]
  }
}
```

**Response:**
```json
{
  "expression": "name.given",
  "result": [["John"]],
  "success": true
}
```

## Example Usage

You can test the API using curl, Postman, or any HTTP client:

```bash
curl -X POST http://localhost:3000/fhirpath \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "name.family",
    "data": {
      "resourceType": "Patient",
      "name": [
        {
          "given": ["John"],
          "family": "Doe"
        }
      ]
    }
  }'
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start the production server
- `npm run dev` - Start development server with auto-reload
- `npm run watch` - Watch for TypeScript changes and recompile

## Dependencies

- **express**: Web framework for Node.js
- **fhirpath**: FHIRPath implementation for JavaScript
- **cors**: Enable CORS for cross-origin requests
- **typescript**: TypeScript compiler and tooling
- **ts-node-dev**: Development tool with TypeScript support and auto-restart
