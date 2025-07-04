// Utility functions for FHIR operations

import { Coding, OperationOutcomeIssue, Parameters, ParametersParameter } from "fhir/r4b";
import { TypeInfo, FP_DateTime, FP_Time, FP_Date, FP_Instant, FP_Quantity } from "fhirpath/src/types";

/**
 * Creates a FHIR OperationOutcome resource for error responses
 */
export function CreateOperationOutcome(
  severity: "error" | "fatal" | "warning" | "information",
  code: "invalid" | "structure" | "required" | "value" | "invariant"
    | "security" | "login" | "unknown" | "expired" | "forbidden" | "suppressed"
    | "processing" | "not-supported" | "duplicate" | "multiple-matches" | "not-found" | "deleted" | "too-long" | "code-invalid" | "extension" | "too-costly" | "business-rule" | "conflict"
    | "transient" | "lock-error" | "no-store" | "exception" | "timeout" | "incomplete" | "throttled"
    | "informational",
  message: string,
  coding?: Coding,
  diagnostics?: string
): fhir4b.OperationOutcome {
  var result: fhir4b.OperationOutcome =
  {
    resourceType: 'OperationOutcome',
    issue: []
  };

  var issue: OperationOutcomeIssue =
  {
    severity: severity,
    code: code,
    details: { text: message }
  }
  if (coding && issue.details)
    issue.details.coding = [coding];
  if (diagnostics)
    issue.diagnostics = diagnostics;
  result.issue.push(issue);
  return result;
}

/**
 * Populates a parameter value in the result Parameters resource
 */
export function populateParameterValue(item: any, result: Parameters) {
  if (result.parameter) {
    let typeName = TypeInfo.fromValue(item).name;
    let retVal: ParametersParameter = { name: item.fhirNodeDataType };
    if (item.fhirNodeDataType !== undefined) {
      if (item.fhirNodeDataType === 'string' || item.fhirNodeDataType === 'System.String' || typeName === 'String')
        retVal.valueString = item.data;
      if (item.fhirNodeDataType === 'boolean')
        retVal.valueBoolean = item.data;
      if (item.fhirNodeDataType === 'code')
        retVal.valueCode = item.data;
      if (item.fhirNodeDataType === 'date')
        retVal.valueDate = item.data;
      if (item.fhirNodeDataType === 'instant')
        retVal.valueInstant = item.data;
      if (item.fhirNodeDataType === 'dateTime')
        retVal.valueDateTime = item.data;
      if (item.fhirNodeDataType === 'time')
        retVal.valueTime = item.data;
      if (item.fhirNodeDataType === 'integer')
        retVal.valueInteger = item.data;
      if (item.fhirNodeDataType === 'decimal')
        retVal.valueDecimal = item.data;
    } else {
      if (typeName === 'String')
        retVal.valueString = item;
      else if (typeName === 'Boolean')
        retVal.valueBoolean = item;
      else if (typeName === 'dateTime')
        retVal.valueDateTime = item;
      else if (typeName === 'time')
        retVal.valueTime = item;
      else if (typeName === 'Integer')
        retVal.valueInteger = item;
      else if (typeName === 'Number') {
        if (Number.isInteger(item) && item.toString().indexOf('.') === -1) {
          retVal.valueInteger = item;
          typeName = 'integer';
        } else {
          retVal.valueDecimal = item;
          typeName = 'decimal';
        }
      }
      else {
        console.log('populateParameterValue: unknown type: ', typeName, TypeInfo.fromValue(item));
        if (item instanceof FP_Instant) {
          retVal.valueInstant = item.asStr;
          typeName = 'instant';
        }
        else if (item instanceof FP_Date) {
          retVal.valueDate = item.asStr;
          typeName = 'date';
        }
        else if (item instanceof FP_DateTime) {
          retVal.valueDateTime = item.asStr;
          typeName = 'dateTime';
        }
        else if (item instanceof FP_Time) {
          retVal.valueTime = item.asStr;
          typeName = 'time';
        }
        else if (item instanceof FP_Quantity) {
          retVal.valueQuantity = {
            value: item.value,
            unit: item.unit,
            // system: item.system,
            // code: item.code
          };
          typeName = 'Quantity';
        }
      }
      retVal.name = typeName;
    }
    result.parameter[1].part?.push(retVal);
    console.log('populateParameterValue: ', retVal);
  }
}
