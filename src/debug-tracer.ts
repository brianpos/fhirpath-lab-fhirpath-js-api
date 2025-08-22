/* eslint-disable linebreak-style */

import fhirpath, { AsyncOptions } from "fhirpath";
import { ResourceNode, TypeInfo } from "fhirpath/src/types";
import { ParametersParameter } from "fhir/r4b";

export interface fpjsNode {
  children?: fpjsNode[];
  // terminalNodeText?: string[];
  text?: string;
  delimitedText?: string;
  type: string;
  start?: { line: number; column: number };
  length?: number;
}

export interface IDebugTraceValue {
      exprName: string,
      exprStartLine?: number,
      exprStartColumn?: number,
      exprEndLine?: number, // the end is here for cases where we don't have a length
      exprEndColumn?: number, // such as for the indexer (well only the indexer right now)
      exprLength?: number,
      values: ITraceValue[],
      thisVar: ITraceValue[],
      focusVar: ITraceValue[],
      totalVar?: ITraceValue[],
      indexVar?: number,
      type?: string
    };

  export interface ITraceValue {
    resourcePath?: string;
    valueType?: string;
    fhirNodeDataType?: string;
    value?: any;
    rawData?: any;
  }

function readFullPropertyName(item: ResourceNode) {
  if (item?.fullPropertyName) {
    return item.fullPropertyName();
  }
  return undefined;
}

// BigInt-aware stringify: represent BigInt as a JSON string with trailing 'n'
export function stringifySafe(val: any, space = 2): string {
  return JSON.stringify(
    val,
    (_key, v) => (typeof v === 'bigint' ? v.toString() + 'n' : v),
    space
  );
}

export function debugTracer(traceOutput: IDebugTraceValue[]) {
  return (ctx: any, focus: any[], result: any[], node: fpjsNode) => {
    if (
      node.type !== "LiteralTerm" &&
      node.type !== "ExternalConstantTerm" &&
      node.type !== "MemberInvocation" &&
      node.type !== "FunctionInvocation" &&
      node.type !== "ThisInvocation" &&
      node.type !== "IndexInvocation" &&
      node.type !== "TotalInvocation" &&
      node.type !== "IndexerExpression" &&
      node.type !== "PolarityExpression" &&
      node.type !== "MultiplicativeExpression" &&
      node.type !== "AdditiveExpression" &&
      node.type !== "TypeExpression" &&
      node.type !== "UnionExpression" &&
      node.type !== "InequalityExpression" &&
      node.type !== "EqualityExpression" &&
      node.type !== "MembershipExpression" &&
      node.type !== "AndExpression" &&
      node.type !== "OrExpression" &&
      node.type !== "ImpliesExpression"
    ) {
      // console.log("skipping " + node.type);
      return;
    }
    console.log( node, focus, result);
    let debugTraceVal: IDebugTraceValue = {
      exprName: node.text??'',
      exprLength: node.length,
      values: [],
      thisVar: [],
      focusVar: [],
      type: node.type
    };
    if (node.start){
      debugTraceVal.exprStartLine = node.start.line - 1; // adjust to 0 based
      debugTraceVal.exprStartColumn = node.start.column - 1; // adjust to 0 based
    }

    if (node.type === "LiteralTerm") debugTraceVal.exprName = "constant";
    if (node.type === "IndexerExpression") debugTraceVal.exprName = "[]";

    for (let item of focus) {
      if (item !== undefined) {
        let val: ITraceValue = ToTraceValue(item);
        debugTraceVal.focusVar?.push(val);
      }
    }

    if (ctx.$index != undefined) {
      debugTraceVal.indexVar = ctx.$index;
    }
    if (ctx.$this || ctx.dataRoot) {
      for (let item of ctx.$this ?? ctx.dataRoot) {
        if (item !== undefined) {
          let val: ITraceValue = ToTraceValue(item);
          debugTraceVal.thisVar?.push(val);
        }
      }
    }
    if (result){
      for (let item of result) {
        if (item !== undefined) {
          let val: ITraceValue = ToTraceValue(item);
          debugTraceVal.values?.push(val);
        }
      }
    }

    traceOutput.push(debugTraceVal);
  };
}

export function ToTraceValue(item: any): ITraceValue {
  let typeName = Object.prototype.toString
    .call(item ?? "")
    .substring(8)
    .replace("]", "");
  if (typeof item.getTypeInfo === "function")
    typeName = item.getTypeInfo().name;
  let val: ITraceValue = {
    valueType: typeName,
    resourcePath: readFullPropertyName(item),
  };
  if (!val.resourcePath) {
    val.value = item.data
      ? stringifySafe(item.data, 2)
      : stringifySafe(item, 2);
  }
  val.rawData = item.data ?? item;
  return val;
}

export function formatTrace(expression: string, traceData: IDebugTraceValue){
  var lines = expression.split('\n'); 
  let curLine = traceData.exprStartLine ?? 0;
  let position = traceData.exprStartColumn ?? 0;
  while (curLine > 0)
  {
    position += lines[curLine - 1].length + 1; // +1 for the newline character
    curLine--;
  }

  return `${position},${traceData.exprLength},${traceData.exprName}: focus=${traceData.focusVar.length} result=${traceData.values.length}  type=${traceData.type}`;
}

export function nodeName(expression: string, traceData: IDebugTraceValue){
  var lines = expression.split('\n'); 
  let curLine = traceData.exprStartLine ?? 0;
  let position = traceData.exprStartColumn ?? 0;
  while (curLine > 0)
  {
    position += lines[curLine - 1].length + 1; // +1 for the newline character
    curLine--;
  }

  return `${position},${traceData.exprLength},${traceData.exprName}`;
}
