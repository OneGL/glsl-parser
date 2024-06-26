import { AstNode, LocationObject, ArraySpecifierNode, FunctionPrototypeNode, FunctionNode, FunctionCallNode, TypeNameNode } from '../ast/index.js';
export type TypeScopeEntry = {
    declaration?: TypeNameNode;
    references: TypeNameNode[];
};
export type TypeScopeIndex = {
    [name: string]: TypeScopeEntry;
};
export type ScopeEntry = {
    declaration?: AstNode;
    references: AstNode[];
};
export type ScopeIndex = {
    [name: string]: ScopeEntry;
};
export type FunctionOverloadDefinition = {
    returnType: string;
    parameterTypes: string[];
    declaration?: FunctionNode;
    references: (FunctionNode | FunctionCallNode | FunctionPrototypeNode)[];
};
export type FunctionOverloadIndex = {
    [signature: string]: FunctionOverloadDefinition;
};
export type FunctionScopeIndex = {
    [name: string]: FunctionOverloadIndex;
};
export type Scope = {
    name: string;
    parent?: Scope;
    bindings: ScopeIndex;
    types: TypeScopeIndex;
    functions: FunctionScopeIndex;
    location?: LocationObject;
};
export declare const UNKNOWN_TYPE = "UNKNOWN TYPE";
export type FunctionSignature = [
    returnType: string,
    parameterTypes: string[],
    signature: string
];
export declare const makeScopeIndex: (firstReference: AstNode, declaration?: AstNode) => ScopeEntry;
export declare const findTypeScope: (scope: Scope | undefined, typeName: string) => Scope | null;
export declare const isDeclaredType: (scope: Scope, typeName: string) => boolean;
export declare const findBindingScope: (scope: Scope | undefined, name: string) => Scope | null;
export declare const extractConstant: (expression: AstNode) => string;
export declare const quantifiersSignature: (quantifier: ArraySpecifierNode[]) => string;
export declare const functionDeclarationSignature: (node: FunctionNode | FunctionPrototypeNode) => FunctionSignature;
export declare const doSignaturesMatch: (definitionSignature: string, definition: FunctionOverloadDefinition, callSignature: FunctionSignature) => boolean;
export declare const findOverloadDefinition: (signature: FunctionSignature, index: FunctionOverloadIndex) => FunctionOverloadDefinition | undefined;
export declare const functionUseSignature: (node: FunctionCallNode) => FunctionSignature;
export declare const newOverloadIndex: (returnType: string, parameterTypes: string[], firstReference: FunctionNode | FunctionCallNode | FunctionPrototypeNode, declaration?: FunctionNode) => FunctionOverloadDefinition;
export declare const findGlobalScope: (scope: Scope) => Scope;
export declare const isDeclaredFunction: (scope: Scope, fnName: string) => boolean;
