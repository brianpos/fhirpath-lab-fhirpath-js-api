// FHIRPath evaluation service

import { evaluateExpression, parseExpression, version } from "@reasonhealth/fhirpath";
import express, { Request, Response } from 'express';
import { CreateOperationOutcome } from './utils'
import { Parameters, ParametersParameter, FhirResource, Extension } from 'fhir/r4b'
import { stringifySafe } from "./debug-tracer";

// Parameter extraction helper
interface ExtractedParameters {
  [key: string]: string | boolean | FhirResource | ParametersParameter[] | Extension[] | undefined;
}

/**
 * Main function to process FHIRPath requests
 */
export async function processFhirPathRequest(req: Request, res: Response) {
    try {
        console.log('=== FHIRPath Request Debug ===')
        console.log('Method:', req.method)
        console.log('URL:', req.url)
        console.log('Content-Type:', req.get('Content-Type'))
        console.log('Body type:', typeof req.body)
        console.log('Body:', req.body)
        // console.log('Raw body exists:', !!req.body)
        console.log('================================')

        // Check if body exists
        if (!req.body) {
            console.log('ERROR: req.body is undefined or null')
            return res.status(400).json(
                CreateOperationOutcome('error', 'invalid', 'Request body is empty or malformed')
            )
        }

        const inputParameters = req.body as Parameters

        // Validate that it's a Parameters resource
        if (inputParameters.resourceType !== 'Parameters') {
            return res.status(400).json(
                CreateOperationOutcome('error', 'invalid', 'Expected FHIR Parameters resource')
            )
        }

        // Extract parameters
        let parameters: ExtractedParameters = {}
        inputParameters.parameter?.forEach((param: ParametersParameter) => {
            parameters[param.name] = param.valueString || param.valueBoolean || param.resource || param.part || param.extension
        })

        // Validate required parameters
        if (!parameters.expression) {
            return res.status(400).json(
                CreateOperationOutcome('error', 'required', 'Missing required parameter: expression')
            )
        }

        if (!parameters.resource) {
            return res.status(400).json(
                CreateOperationOutcome('error', 'required', 'Missing required parameter: resource')
            )
        }

        // FHIRPath evaluation here
        let result: Parameters = {
            resourceType: 'Parameters',
            parameter: [
                {
                    name: 'parameters',
                    part: [
                        {
                            name: 'evaluator',
                            valueString: `@reasonhealth/fhirpath-${version()} (wasm)`
                        },
                        {
                            name: 'expression',
                            valueString: parameters.expression as string
                        },
                        {
                            name: 'resource',
                            // resource: parameters.resource as FhirResource
                        }
                    ]
                },
                {
                    name: 'result',
                    part: [
                    ]
                }
            ]
        }

        let expression = parameters.expression as string;
        let fhirData = parameters.resource as FhirResource;
        if (!fhirData) {
            // read the json from the extension if that's there
            const extensions = parameters.resource as Extension[] | undefined;
            const extension = extensions?.find(ext => ext.url === 'http://fhir.forms-lab.com/StructureDefinition/json-value');
            if (extension) {
                fhirData = JSON.parse(extension.valueString!) as FhirResource;
            }
        }

        // Parse the expression using WASM
        const parseResult = parseExpression(expression, { format: 'json' });
        if (!parseResult.success || !parseResult.value) {
            return res.status(400).json(
                CreateOperationOutcome('error', 'invalid', `Failed to parse expression: ${parseResult.error || 'Unknown error'}`)
            );
        }

        // inject the parsed AST into the parameters
        result.parameter![0].part!.push({
            name: 'parseDebugTree',
            valueString: JSON.stringify(parseResult.value, null, 2)
        });
        result.parameter![0].part!.push({
            name: 'parseDebugTreeJs',
            valueString: JSON.stringify(parseResult.value, null, 2)
        });

        console.log('Evaluating FHIRPath expression: ', expression);
        
        // Build environment with variables
        let environment: Record<string, any> = { resource: fhirData, rootResource: fhirData };

        // read the variables from the parameters
        if (parameters.variables && Array.isArray(parameters.variables)) {
            // read through all the parameters
            for (let varParam of parameters.variables as ParametersParameter[]) {
                let name = varParam.name;
                if (name.startsWith('`')){
                    name = name.slice(1, -1).replace(/(^`|`$)/g, "")
                            .replace(/\\(u\d{4}|.)/g, function(match, submatch) {
                            switch(match) {
                                case '\\r':
                                return '\r';
                                case '\\n':
                                return "\n";
                                case '\\t':
                                return '\t';
                                case '\\f':
                                return '\f';
                                default:
                                if (submatch.length > 1)
                                    return String.fromCharCode(Number('0x'+submatch.slice(1)));
                                else
                                    return submatch;
                            }
                            });
                }
                if (name.startsWith("'")){
                    name = name.slice(1, -1).replace(/(^'|'$)/g, "")
                            .replace(/\\(u\d{4}|.)/g, function(match, submatch) {
                            switch(match) {
                                case '\\r':
                                return '\r';
                                case '\\n':
                                return "\n";
                                case '\\t':
                                return '\t';
                                case '\\f':
                                return '\f';
                                default:
                                if (submatch.length > 1)
                                    return String.fromCharCode(Number('0x'+submatch.slice(1)));
                                else
                                    return submatch;
                            }
                            });
                }
                environment[name] = varParam.valueString
                    || varParam.valueBoolean
                    || varParam.valueInteger
                    || varParam.valueDecimal
                    || varParam.valueDate
                    || varParam.valueTime
                    || varParam.valueDateTime
                    || varParam.resource;
            }
        }

        // Evaluate using WASM
        const evaluateResult = evaluateExpression(expression, fhirData, { format: 'json' });
        if (!evaluateResult.success) {
            return res.status(400).json(
                CreateOperationOutcome('error', 'invalid', `Failed to evaluate expression: ${evaluateResult.error || 'Unknown error'}`)
            );
        }

        // Extract results from WASM result object
        let data: any[] = [];
        if (evaluateResult.value) {
            if (Array.isArray(evaluateResult.value)) {
                data = evaluateResult.value;
            } else if (typeof evaluateResult.value === 'object') {
                const resultObj = evaluateResult.value as any;
                // WASM returns {result: [...], count: N, trace: [], type: 'collection'}
                if (resultObj.result && Array.isArray(resultObj.result)) {
                    data = resultObj.result;
                } else {
                    data = [evaluateResult.value];
                }
            } else {
                data = [evaluateResult.value];
            }
        }
        console.log('FHIRPath evaluation result:', data);

        // Process results - convert WASM result format to FHIR Parameters
        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                // Handle WASM wrapper format for single values
                let actualValue = item;
                if (typeof item === 'object' && item !== null && item.result !== undefined) {
                    actualValue = item.result;
                }
                
                let retVal: ParametersParameter = {
                    name: typeof actualValue === 'string' ? 'string' : 'value',
                };
                
                if (typeof actualValue === 'string') {
                    retVal.valueString = actualValue;
                } else if (typeof actualValue === 'boolean') {
                    retVal.valueBoolean = actualValue;
                    retVal.name = 'boolean';
                } else if (typeof actualValue === 'number') {
                    if (Number.isInteger(actualValue)) {
                        retVal.valueInteger = actualValue;
                        retVal.name = 'integer';
                    } else {
                        retVal.valueDecimal = actualValue;
                        retVal.name = 'decimal';
                    }
                } else {
                    // Complex object - store as JSON extension
                    retVal.extension = [
                        {
                            url: "http://fhir.forms-lab.com/StructureDefinition/json-value",
                            valueString: stringifySafe(actualValue, 2)
                        }
                    ];
                }
                
                result.parameter![1].part!.push(retVal);
            });
        }

        // Note: Debug trace is not available with WASM engine
        let debugTrace: ParametersParameter = {
            name: 'debug-trace',
            part: []
        };
        result.parameter!.push(debugTrace);

        res.setHeader('Content-Type', 'application/fhir+json')
        res.json(result)

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        res.status(400).json(
            CreateOperationOutcome('error', 'invalid', `Error processing request: ${errorMessage}`)
        )
    }
}

export interface JsonNode {
  id?: string;
  ExpressionType: string;
  Name: string;
  Arguments?: JsonNode[];
  ReturnType?: string;
  Position?: number;
  Length?: number;
  Line?: number;
  Column?: number;

  /** URL to the Specification for this node - Augmented by the Lab */
  SpecUrl?: string;
}
