// FHIRPath evaluation service

import fhirpath, { AsyncOptions } from "fhirpath";
import express, { Request, Response } from 'express';
// Import types from the local demo types file or use any for now
// import { TypeInfo, FP_DateTime, FP_Time, FP_Date, FP_Instant, FP_Quantity } from "./types";
import { FP_Date, FP_DateTime, FP_Instant, FP_Quantity, FP_Time, ResourceNode } from "fhirpath/src/types";
import { CreateOperationOutcome, populateParameterValue } from './utils'
import { OperationOutcome, Parameters, ParametersParameter, FhirResource, Extension } from 'fhir/r4b'
import fhirpath_r5_model from "fhirpath/fhir-context/r5";
import { debugTracer, formatTrace, fpjsNode, IDebugTraceValue, ITraceValue, nodeName, stringifySafe, ToTraceValue } from "./debug-tracer";

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

        // inject the parsed AST into the parameters
        const ast = fhirpath.parse(expression).children[0].children[0];
        const rawAST = JSON.stringify(ast, null, 2);
        result.parameter![0].part!.push({
            name: 'parseDebugTree',
            valueString: JSON.stringify(ConvertFhirPathJsToAst(ast), null, 2)
        });
        result.parameter![0].part!.push({
            name: 'parseDebugTreeJs',
            valueString: rawAST
        });

        console.log('Evaluating FHIRPath expression: ', expression);
        let environment: Record<string, any> = { resource: fhirData, rootResource: fhirData };
        let debugTraceOutput: IDebugTraceValue[] = [];
        let traceData: { label: string, value: ITraceValue[] }[] = [];
        let options: AsyncOptions = {
            traceFn: (value: any, label: string) => {
                console.log("trace: ", label, value);
                if (Array.isArray(value)) {
                    traceData.push({ label, value: value.map(ToTraceValue) });
                } else {
                    traceData.push({ label, value: [ToTraceValue(value)] });
                }
            },
            // debugger: debugTracer(debugTraceOutput),
            async: true,
        };

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
                    // and also do the replacements.

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
                    // and also do the replacements.

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

        let data = fhirpath.evaluate(fhirData, expression, environment, fhirpath_r5_model, options);
        if (data instanceof Promise){
            data = await data;
        }
        console.log('FHIRPath evaluation result:', data);

        let logData = [];
        for (let traceData of debugTraceOutput) {
            logData.push(formatTrace(expression, traceData));
        }
        console.log(logData);

        // push the results into the parameters resource
        const finalResult = debugTraceOutput[debugTraceOutput.length - 1];
        if (finalResult.values && finalResult.values.length > 0) {
            finalResult.values.forEach((item: any) => {
                let retVal: ParametersParameter = {
                    name: item.fhirNodeDataType ?? item.valueType ?? 'string',
                };
                SetParameterValue(retVal, item, true);
                result.parameter![1].part!.push(retVal);
            });
        }

        // inject the trace() data
        if (traceData && traceData.length > 0) {
            for (let item of traceData) {
                let valTrace: ParametersParameter = {
                    name: 'trace',
                    valueString: item.label,
                    part: []
                };
                result.parameter![1].part!.push(valTrace);

                for (let value of item.value) {
                    let retVal: ParametersParameter = {
                        name: value.fhirNodeDataType ?? 'string',
                    };
                    SetParameterValue(retVal, value, true);
                    valTrace.part!.push(retVal);
                }
            }
        }

        // and push the debugger trace content in too
        let debugTrace: ParametersParameter = {
            name: 'debug-trace',
            part: []
        };
        for (let item of debugTraceOutput) {
            let itemPart: ParametersParameter = {
                name: nodeName(expression, item),
                part: []
            };
            debugTrace.part!.push(itemPart);

            // add the values into the traced debug item
            item.values.forEach((item: any) => {
                let retVal: ParametersParameter = {
                    name: item.fhirNodeDataType ?? item.valueType ?? 'string',
                };
                SetParameterValue(retVal, item, false);
                itemPart.part!.push(retVal);
            });

            item.thisVar.forEach((item: any) => {
                let retVal: ParametersParameter = {
                    name: item.fhirNodeDataType ?? item.valueType ?? 'string',
                };
                SetParameterValue(retVal, item, false);
                retVal.name = 'this-' + retVal.name;
                itemPart.part!.push(retVal);
            });

            item.focusVar.forEach((item: any) => {
                let retVal: ParametersParameter = {
                    name: item.fhirNodeDataType ?? item.valueType ?? 'string',
                };
                SetParameterValue(retVal, item, false);
                retVal.name = 'focus-' + retVal.name;
                itemPart.part!.push(retVal);
            });

            if (item.indexVar !== undefined) {
                let retVal: ParametersParameter = {
                    name: 'index',
                    valueInteger: item.indexVar
                };
                itemPart.part!.push(retVal);
            }
        }
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

function SetParameterValue(retVal: ParametersParameter, item: any, fullData: boolean) {
    retVal.name = item.fhirNodeDataType ?? item.valueType ?? 'string';
    if (item.resourcePath) {
        // add in the resource path extension
        retVal.extension = [
            {
                url: 'http://fhir.forms-lab.com/StructureDefinition/resource-path',
                valueString: item.resourcePath
            }
        ];
    }
    if (item.fhirNodeDataType !== undefined) {

        switch (item.fhirNodeDataType)
        {
            case 'string':
            case 'System.String':
            case 'String':
                retVal.valueString = item.rawData;
                break;
            case 'boolean':
                retVal.valueBoolean = item.rawData === true;
                break;
            case 'code':
                retVal.valueCode = item.value;
                break;
            case 'date':
                retVal.valueDate = item.value;
                break;
            case 'instant':
                retVal.valueInstant = item.value;
                break;
            case 'dateTime':
                retVal.valueDateTime = item.value;
                break;
            case 'time':
                retVal.valueTime = item.value;
                break;
            case 'integer':
                retVal.valueInteger = item.value;
                break;
            case 'decimal':
                retVal.valueDecimal = item.value;
                break;
            case 'Quantity':
                retVal.valueQuantity = item.value;
                break;
            case 'HumanName':
                retVal.valueHumanName = item.value;
                break;
            default:
                if (fullData){
                    retVal.extension = retVal.extension ?? [];
                    let extResourceData: Extension = {
                        url: "http://fhir.forms-lab.com/StructureDefinition/json-value",
                        valueString: stringifySafe(item.rawData ?? item.value ?? item, 2)
                    };
                    retVal.extension.push(extResourceData);
                }
                else if (item.resourcePath) {
                    retVal.name = 'resource-path';
                    retVal.valueString = item.resourcePath;
                    delete retVal.extension;
                }
                break;
        }
    } else {
        if (item.valueType === 'String')
            retVal.valueString = item.rawData;
        else if (item.valueType === 'Boolean')
            retVal.valueBoolean = item.rawData;
        else if (item.valueType === 'date' || item.valueType === 'Date') {
            retVal.valueDate = item.rawData;
            retVal.name = 'date';
        }
        else if (item.valueType === 'dateTime' || item.valueType === 'DateTime') {
            retVal.valueDateTime = item.rawData;
            retVal.name = 'dateTime';
        }
        else if (item.valueType === 'time' || item.valueType === 'Time') {
            retVal.valueTime = item.rawData;
            retVal.name = 'time';
        }
        else if (item.valueType === 'integer' || item.valueType === 'Integer') {
            retVal.valueInteger = item.rawData;
            retVal.name = 'integer';
        }
        else if (item.valueType === 'Decimal') {
            retVal.valueDecimal = item.rawData;
            retVal.name = 'decimal';
        }
        else if (item.valueType === 'Long') {
            retVal.valueInteger = item.rawData.toString();
            retVal.name = 'integer';
        }
        else if (item.valueType === 'Number') {
            const val = item.rawData ?? item.value ?? item;
            if (Number.isInteger(val) && val.toString().indexOf('.') === -1) {
                retVal.valueInteger = val;
                retVal.name = 'integer';
            } else {
                retVal.valueDecimal = Number.parseFloat(val);
                retVal.name = 'decimal';
            }
        }
        else if (item.valueType === 'Quantity') {
            retVal.valueQuantity = {
                value: item.rawData.value,
                unit: item.rawData.unit,
                system: 'http://unitsofmeasure.org',
                code: item.rawData.unit,
            };
            if (!item.rawData.unit.startsWith("'")){
                // this is a calendar unit
                retVal.valueQuantity.system = "http://hl7.org/fhirpath/CodeSystem/calendar-units";
            }
            retVal.name = 'Quantity';
        }
        else {
            if (item instanceof FP_Instant) {
                retVal.valueInstant = item.asStr;
                retVal.name = 'instant';
            }
            else if (item instanceof FP_Date) {
                retVal.valueDate = item.asStr;
                retVal.name = 'date';
            }
            else if (item instanceof FP_DateTime) {
                retVal.valueDateTime = item.asStr;
                retVal.name = 'dateTime';
            }
            else if (item instanceof FP_Time) {
                retVal.valueTime = item.asStr;
                retVal.name = 'time';
            }
            else if (item instanceof FP_Quantity) {
                retVal.valueQuantity = {
                    value: item.value,
                    unit: item.unit,
                    system: "http://unitsofmeasure.org",
                    code: item.unit
                };
                if (!item.unit.startsWith("'")){
                    // this is a calendar unit
                    retVal.valueQuantity.system = "http://hl7.org/fhirpath/CodeSystem/calendar-units";
                }
                retVal.name = 'Quantity';
            }
            else {
                if (fullData) {
                    // this is the just throw it in as JSON stage
                    retVal.extension = retVal.extension ?? [];
                    let extResourceData: Extension = {
                        url: "http://fhir.forms-lab.com/StructureDefinition/json-value",
                        valueString: stringifySafe(item.rawData ?? item.value ?? item, 2)
                    };
                    retVal.extension.push(extResourceData);
                }
                else if (item.resourcePath) {
                    retVal.name = 'resource-path';
                    retVal.valueString = item.resourcePath;
                    delete retVal.extension;
                }
            }
        }
        // retVal.valueString = item.rawData ?? JSON.stringify(item, null, 2);
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

function ConvertFhirPathJsToAst(ast: fpjsNode): JsonNode {
  let result: JsonNode = {
    ExpressionType: ast.type,
    Name: ast.text ?? ast.delimitedText ?? "",
    Arguments: [],
    // ReturnType: "",
  };

  if (ast.length) {
    result.Length = ast.length;
  }

  if (ast.start) {
    result.Line = ast.start.line;
    result.Column = ast.start.column;
  }

  // convert all the child nodes
  if (ast.children) {
    ast.children.forEach((element: fpjsNode) => {
      result.Arguments?.push(ConvertFhirPathJsToAst(element));
    });
  } else {
    delete result.Arguments;
  }

  // Populate the Type for known types
  switch (result.ExpressionType) {
    case "StringLiteral":
      result.ReturnType = "string";
      result.ExpressionType = "ConstantExpression";
      result.Name = result.Name.substring(1, result.Name.length - 1);
      break;
    case "BooleanLiteral":
      result.ReturnType = "boolean";
      result.ExpressionType = "ConstantExpression";
      break;
    case "QuantityLiteral":
      result.ReturnType = "Quantity";
      result.ExpressionType = "ConstantExpression";
      if (result.Arguments && result.Arguments.length > 0) {
        result.Name = result.Arguments[0].Name;
      }
      delete result.Arguments;
      return result;
      break;
    case "DateTimeLiteral":
      result.ReturnType = "dateTime";
      result.ExpressionType = "ConstantExpression";
      result.Name = result.Name.substring(1);
      break;
    case "TimeLiteral":
      result.ReturnType = "time";
      result.ExpressionType = "ConstantExpression";
      result.Name = result.Name.substring(2);
      break;
    case "NumberLiteral":
      result.ReturnType = "Number (decimal or integer)";
      result.ExpressionType = "ConstantExpression";
      break;
  }

  // Short circuit some of the AST that is not useful to display
  if (
    result.Arguments?.length == 1 &&
    result.ExpressionType == "FunctionInvocation"
  ) {
    return result.Arguments[0];
  }
  if (result.Arguments?.length == 1 && result.ExpressionType == "Quantity") {
    result.Name = result.Name + " " + result.Arguments[0].Name;
    delete result.Arguments;
    return result;
  }
  if (result.Arguments?.length == 1 && result.ExpressionType == "Unit") {
    return result.Arguments[0];
  }
  if (result.Arguments?.length == 1 && result.ExpressionType == "LiteralTerm") {
    result.Arguments[0].Line = result.Line;
    result.Arguments[0].Column = result.Column;
    result.Arguments[0].Length = result.Length;
    return result.Arguments[0];
  }
  if (
    result.Arguments?.length == 1 &&
    result.ExpressionType == "TermExpression"
  ) {
    return result.Arguments[0];
  }
  if (
    result.Arguments?.length == 1 &&
    result.ExpressionType == "ExternalConstantTerm"
  ) {
    return result.Arguments[0];
  }

  if (
    result.ExpressionType == "MemberInvocation" &&
    result.Arguments &&
    result.Arguments.length === 1 &&
    result.Arguments[0].ExpressionType == "Identifier"
  ) {
    result.ExpressionType = "ChildExpression";
    result.Name = result.Arguments[0].Name ?? "";
    delete result.Arguments;
  }

  if (
    result.ExpressionType == "ExternalConstant" &&
    result.Arguments &&
    result.Arguments.length === 1 &&
    result.Arguments[0].ExpressionType == "Identifier"
  ) {
    result.ExpressionType = "VariableRefExpression";
    result.Name = result.Arguments[0].Name ?? "";
    delete result.Arguments;
  }

  // restructure the function call part of the tree
  if (
    result.ExpressionType == "Functn" &&
    result.Arguments &&
    result.Arguments.length === 2 &&
    result.Arguments[0].ExpressionType == "Identifier" &&
    result.Arguments[1].ExpressionType == "ParamList"
  ) {
    result.ExpressionType = "FunctionCallExpression";
    result.Name = result.Arguments[0].Name ?? "";
    result.Line = result.Arguments[0].Line;
    result.Column = result.Arguments[0].Column;
    result.Length = result.Arguments[0].Length;
    result.Arguments = result.Arguments[1].Arguments;
  }
  if (
    result.ExpressionType == "Functn" &&
    result.Arguments &&
    result.Arguments.length === 1 &&
    result.Arguments[0].ExpressionType == "Identifier"
  ) {
    result.ExpressionType = "FunctionCallExpression";
    result.Name = result.Arguments[0].Name ?? "";
    delete result.Arguments;
  }

  if (
    result.Arguments?.length == 1 &&
    result.ExpressionType == "InvocationTerm" // this is the "scoping node"
  ) {
    // inject the scoping node into the tree
    let scopeNode: JsonNode = {
      ExpressionType: "AxisExpression",
      Name: "builtin.that",
      Arguments: [],
      ReturnType: "",
    };
    if (result.Arguments[0].Arguments)
      result.Arguments[0].Arguments?.unshift(scopeNode);
    else result.Arguments[0].Arguments = [scopeNode];
    return result.Arguments[0];
  }

  // -----------
  if (
    result.ExpressionType == "InvocationExpression" &&
    result.Arguments &&
    result.Arguments?.length > 1
  ) {
    if (result.Arguments[1].Arguments)
      result.Arguments[1].Arguments?.unshift(result.Arguments[0]);
    else result.Arguments[1].Arguments = [result.Arguments[0]];
    return result.Arguments[1];
  }
  return result;
}
