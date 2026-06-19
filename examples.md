# FHIRPath API Examples

This document provides example requests for the FHIRPath evaluation API using the @reasonhealth/fhirpath WASM engine.

## Base URL
```
http://localhost:7071/$rust-r5
```

## Example 1: Simple Property Access

**Expression:** Get all given names from a patient

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
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
          "id": "patient-123",
          "name": [
            {
              "given": ["John", "Jacob"],
              "family": "Doe"
            },
            {
              "given": ["Johnny"],
              "family": "Smith"
            }
          ]
        }
      }
    ]
  }'
```

**Expected Result:**
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
        }
      ]
    },
    {
      "name": "result",
      "part": [
        {
          "name": "string",
          "valueString": "John"
        },
        {
          "name": "string",
          "valueString": "Jacob"
        },
        {
          "name": "string",
          "valueString": "Johnny"
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

---

## Example 2: Filtering with Where Clause

**Expression:** Get family names where the given name is "John"

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.name.where(given.exists(where($this = '\''John'\''))).family"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-456",
          "name": [
            {
              "given": ["John"],
              "family": "Doe"
            },
            {
              "given": ["Jane"],
              "family": "Smith"
            }
          ]
        }
      }
    ]
  }'
```

**Expected Result:**
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
          "valueString": "Patient.name.where(given.exists(where($this = 'John'))).family"
        },
        {
          "name": "parseDebugTree",
          "valueString": "{ ... }"
        }
      ]
    },
    {
      "name": "result",
      "part": [
        {
          "name": "string",
          "valueString": "Doe"
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

---

## Example 3: Function Evaluation (count)

**Expression:** Count the number of names

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.name.count()"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-789",
          "name": [
            {
              "given": ["John"],
              "family": "Doe"
            },
            {
              "given": ["Jane"],
              "family": "Smith"
            }
          ]
        }
      }
    ]
  }'
```

**Expected Result:**
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
          "valueString": "Patient.name.count()"
        },
        {
          "name": "parseDebugTree",
          "valueString": "{ ... }"
        }
      ]
    },
    {
      "name": "result",
      "part": [
        {
          "name": "integer",
          "valueInteger": 2
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

---

## Example 4: Boolean Expression

**Expression:** Check if patient has active status

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.active = true"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-active",
          "active": true,
          "name": [
            {
              "given": ["John"],
              "family": "Doe"
            }
          ]
        }
      }
    ]
  }'
```

**Expected Result:**
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
          "valueString": "Patient.active = true"
        },
        {
          "name": "parseDebugTree",
          "valueString": "{ ... }"
        }
      ]
    },
    {
      "name": "result",
      "part": [
        {
          "name": "boolean",
          "valueBoolean": true
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

---

## Example 5: Complex Resource (Observation)

**Expression:** Get all observation codes and values

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Observation.code.coding.code | Observation.value.as(Quantity).value"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Observation",
          "id": "obs-123",
          "status": "final",
          "code": {
            "coding": [
              {
                "system": "http://loinc.org",
                "code": "55284-4",
                "display": "Blood pressure systolic and diastolic"
              }
            ]
          },
          "valueQuantity": {
            "value": 120,
            "unit": "mmHg",
            "system": "http://unitsofmeasure.org",
            "code": "mm[Hg]"
          }
        }
      }
    ]
  }'
```

---

## Example 6: Variables Support

**Expression:** Compare patient name with variable

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.name.given.where($this = $targetName)"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-vars",
          "name": [
            {
              "given": ["John", "Jacob"],
              "family": "Doe"
            }
          ]
        }
      },
      {
        "name": "variables",
        "part": [
          {
            "name": "targetName",
            "valueString": "John"
          }
        ]
      }
    ]
  }'
```

**Expected Result:**
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
          "valueString": "Patient.name.given.where($this = $targetName)"
        },
        {
          "name": "parseDebugTree",
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

---

## Example 7: Error Handling - Invalid Expression

**Request:**
```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.invalid.syntax.."
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-error"
        }
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "invalid",
      "diagnostics": "Failed to parse expression: [error message]"
    }
  ]
}
```

---

## Example 8: Nested Path Access

**Expression:** Get all addresses and their cities

```bash
curl -X POST http://localhost:7071/\$rust-r5 \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Parameters",
    "parameter": [
      {
        "name": "expression",
        "valueString": "Patient.address.city"
      },
      {
        "name": "resource",
        "resource": {
          "resourceType": "Patient",
          "id": "patient-addr",
          "address": [
            {
              "use": "home",
              "line": ["123 Main St"],
              "city": "Springfield",
              "state": "IL",
              "postalCode": "62701"
            },
            {
              "use": "work",
              "line": ["456 Oak Ave"],
              "city": "Chicago",
              "state": "IL",
              "postalCode": "60601"
            }
          ]
        }
      }
    ]
  }'
```

---

## Using the API with curl

All examples use curl with the following common options:
- `-X POST`: HTTP POST method
- `-H "Content-Type: application/json"`: JSON content type header
- `-d '{...}'`: JSON request body

## Response Structure

All successful responses follow this structure:
- `resourceType: "Parameters"` - FHIR Parameters resource
- `parameter[0]`: metadata (evaluator, expression, AST)
- `parameter[1]`: results array
- `parameter[2]`: debug-trace (empty for WASM engine)

## Key Differences from fhirpath.js

1. **Evaluator String**: Now shows `@reasonhealth/fhirpath-X.X.X (wasm)` instead of `fhirpath.js-X.X.X (r5)`
2. **Debug Trace**: Currently returns empty for WASM engine (no execution tracing available)
3. **Performance**: WASM implementation is typically faster for complex expressions
4. **Result Format**: Simplified result conversion to FHIR parameters format

## Running the Examples

Start the server:
```bash
npm run dev
```

Then run any of the curl commands above. The server will evaluate the FHIRPath expression and return the results in FHIR Parameters format.
