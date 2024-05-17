import type { AstNode } from '../ast/index.js';
import { Scope } from './scope.js';
export declare const renameBindings: (scope: Scope, mangle: (name: string, node: AstNode) => string) => void;
export declare const renameTypes: (scope: Scope, mangle: (name: string, node: AstNode) => string) => void;
export declare const renameFunctions: (scope: Scope, mangle: (name: string, node: AstNode) => string) => void;
export declare const xor: (a: any, b: any) => boolean;
