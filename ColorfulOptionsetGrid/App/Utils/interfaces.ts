

export interface ISetupSchemaValue{
    icon ?: string;
    color?: string;
    label?: string;
} 

export interface ISetupSchema{
    [value: string] : ISetupSchemaValue;           
}



export type IConfigRawValues =Map<string, ISetupSchema | undefined>;
