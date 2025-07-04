// Workaround to include the definition of the parse function
// (which is actually there, just not in the definition)
declare module 'fhirpath/src/types' {
  // Regular expressions for date/time validation
  export const timeRE: RegExp;
  export const dateTimeRE: RegExp;
  export const dateRE: RegExp;
  export const instantRE: RegExp;

  // Base class for FHIRPath types
  export class FP_Type {
    asStr?: string;
    
    constructor();
    equals(otherObj: any): boolean | undefined;
    equivalentTo(otherObj: any): boolean | undefined;
    toString(): string;
    toJSON(): string;
    compare(otherObj: any): number;
    plus(otherObj: any): any;
    mul(otherObj: any): any;
    div(otherObj: any): any;
  }

  // Quantity type for FHIRPath
  export class FP_Quantity extends FP_Type {
    value: number;
    unit: string;
    
    constructor(value: number, unit: string);
    equals(otherQuantity: FP_Quantity): boolean | undefined;
    equivalentTo(otherQuantity: FP_Quantity): boolean | undefined;
    compare(otherQuantity: FP_Quantity): number | null;
    plus(otherQuantity: FP_Quantity): FP_Quantity | null;
    mul(otherQuantity: FP_Quantity): FP_Quantity | null;
    div(otherQuantity: FP_Quantity): FP_Quantity | null;
    
    convToUcumUnits(quantity: FP_Quantity, unitInSeconds?: number): { unit: string; value: number } | null;
    
    static getEquivalentUcumUnitCode(unit: string): string;
    static toUcumQuantity(value: number, unit: string): { value: number; unit: string };
    static convUnitTo(fromUnit: string, value: number, toUnit: string): FP_Quantity | null;
    
    static _calendarDuration2Seconds: Record<string, number>;
    static _yearMonthConversionFactor: Record<string, number>;
    static dateTimeArithmeticDurationUnits: Record<string, string>;
    static mapUCUMCodeToTimeUnits: Record<string, string>;
    static mapTimeUnitsToUCUMCode: Record<string, string>;
    
    private _compareYearsAndMonths(otherQuantity: FP_Quantity): { isEqual: boolean } | null;
  }

  // Base class for time-based types
  export class FP_TimeBase extends FP_Type {
    precision?: number;
    timeMatchData?: RegExpMatchArray;
    timeParts?: string[];
    dateObj?: Date;
    
    constructor(timeStr: string);
    plus(timeQuantity: FP_Quantity): FP_TimeBase;
    equals(otherDateTime: FP_TimeBase): boolean | undefined;
    equivalentTo(otherDateTime: FP_TimeBase): boolean;
    compare(otherTime: FP_TimeBase): number | null;
    
    protected _getPrecision(): number;
    protected _getMatchData(regEx?: RegExp, maxPrecision?: number): RegExpMatchArray | null;
    protected _getTimeParts(timeMatchData?: RegExpMatchArray): string[];
    protected _getDateObj(): Date;
    protected _dateAtPrecision(precision: number): Date;
    protected _createDate(
      year: number, 
      month: number, 
      day: number, 
      hour: number, 
      minutes: number, 
      seconds: number, 
      ms: number, 
      timezoneOffset?: string
    ): Date;
    
    static timeUnitToAddFn: Record<string, (date: Date, amount: number) => Date>;
  }

  // DateTime type
  export class FP_DateTime extends FP_TimeBase {
    constructor(dateStr: string);
    compare(otherDateTime: FP_DateTime): number | null;
    
    protected _getMatchData(): RegExpMatchArray | null;
    protected _getTimeParts(): string[];
    protected _dateAtPrecision(precision: number): Date;
    
    static checkString(str: string): FP_DateTime | null;
    static isoDateTime(date: Date, precision?: number): string;
    static isoTime(date: Date, precision?: number): string;
    
    static _timeUnitToDatePrecision: Record<string, number>;
    static _datePrecisionToTimeUnit: string[];
  }

  // Time type
  export class FP_Time extends FP_TimeBase {
    constructor(timeStr: string);
    compare(otherTime: FP_Time): number | null;
    
    protected _dateAtPrecision(precision: number): Date;
    protected _getMatchData(): RegExpMatchArray | null;
    protected _getTimeParts(): string[];
    
    static checkString(str: string): FP_Time | null;
    static _timeUnitToDatePrecision: Record<string, number>;
    static _datePrecisionToTimeUnit: string[];
  }

  // Date type
  export class FP_Date extends FP_DateTime {
    constructor(dateStr: string);
    
    protected _getMatchData(): RegExpMatchArray | null;
    
    static checkString(str: string): FP_Date | null;
    static isoDate(date: Date, precision?: number): string;
  }

  // Instant type
  export class FP_Instant extends FP_DateTime {
    constructor(instantStr: string);
    
    protected _getMatchData(): RegExpMatchArray | null;
    
    static checkString(str: string): FP_Instant | null;
  }

  // Resource Node for FHIR resources
  export class ResourceNode {
    parentResNode: ResourceNode | null;
    path: string | null;
    data: any;
    _data: Record<string, any>;
    fhirNodeDataType: string | null;
    model: any;
    propName: string | null;
    index: number | null;
    typeInfo?: TypeInfo;
    convertedData?: any;
    
    constructor(
      data: any,
      parentResNode?: ResourceNode | null,
      path?: string | null,
      _data?: Record<string, any>,
      fhirNodeDataType?: string | null,
      model?: any,
      propName?: string | null,
      index?: number | null
    );
    
    getTypeInfo(): TypeInfo;
    toJSON(): string;
    convertData(): any;
    fullPropertyName(): string;
    
    static makeResNode(
      data: any,
      parentResNode?: ResourceNode | null,
      path?: string | null,
      _data?: Record<string, any>,
      fhirNodeDataType?: string | null,
      model?: any,
      propName?: string | null,
      index?: number | null
    ): ResourceNode;
  }

  // Type information class
  export class TypeInfo {
    name: string;
    namespace?: string;
    
    constructor(options: { name: string; namespace?: string });
    
    is(other: TypeInfo, model?: any): boolean;
    isConvertibleTo(other: TypeInfo, model?: any): boolean;
    toString(): string;
    isValid(model?: any): boolean;
    
    static model: any;
    static System: string;
    static FHIR: string;
    
    static FhirValueSet: TypeInfo;
    static FhirUri: TypeInfo;
    static SystemString: TypeInfo;
    static FhirCodeSystem: TypeInfo;
    static FhirCodeableConcept: TypeInfo;
    static FhirCoding: TypeInfo;
    static FhirCode: TypeInfo;
    static FhirConceptMap: TypeInfo;
    
    static typeToClassWithCheckString: Record<string, any>;
    
    static isType(type: string, superType: string, model?: any): boolean;
    static createByValueInSystemNamespace(value: any): TypeInfo;
    static fromValue(value: any): TypeInfo;
    static isPrimitive(typeInfo: TypeInfo): boolean;
    static isPrimitiveValue(value: any): boolean;
  }

  // Utility functions
  export function typeFn(coll: any[]): TypeInfo[];
  export function isFn(this: { model?: any }, coll: any[], typeInfo: TypeInfo): boolean | [];
  export function asFn(this: { model?: any }, coll: any[], typeInfo: TypeInfo): any[];
  export function toJSON(obj: any, space?: string | number): string;
}
