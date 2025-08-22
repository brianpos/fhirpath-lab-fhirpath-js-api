// FHIRPath evaluation service

import fhirpath, { AsyncOptions } from "fhirpath";
import express, { Request, Response } from 'express';
import { TypeInfo, FP_DateTime, FP_Time, FP_Date, FP_Instant, FP_Quantity } from "fhirpath/src/types";
import { CreateOperationOutcome, populateParameterValue } from './utils'
import { OperationOutcome, Parameters, ParametersParameter, FhirResource, Extension } from 'fhir/r4b'
import fhirpath_r5_model from "fhirpath/fhir-context/r5";

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
                            valueString: `fhirpath.js-` + fhirpath.version + ` (r5)`
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
        console.log('Evaluating FHIRPath expression: ', expression);
        let environment: Record<string, any> = { resource: fhirData, rootResource: fhirData };
        let options: AsyncOptions = {
            traceFn: (value: any, label: string) => {
                if (label === 'TESTING_RESULT') {
                    console.log('result: ', value);
                    if (Array.isArray(value)) {
                        for (let item of value) {
                            populateParameterValue(item, result);
                        }
                    } else {
                        populateParameterValue(value, result);
                    }
                }
                else {
                    console.log("trace: ", label, value);
                }
            },
            async: true,
        };
        let data = fhirpath.evaluate(fhirData, 'select(\n' + expression + `\n).trace('TESTING_RESULT')`, environment, fhirpath_r5_model, options);
        if (data instanceof Promise){
            data = await data;
        }
        console.log('FHIRPath evaluation result:', data);

        res.setHeader('Content-Type', 'application/fhir+json')
        res.json(result)

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        res.status(400).json(
            CreateOperationOutcome('error', 'invalid', `Error processing request: ${errorMessage}`)
        )
    }
}
