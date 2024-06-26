export var renameBindings = function (scope, mangle) {
    Object.entries(scope.bindings).forEach(function (_a) {
        var name = _a[0], binding = _a[1];
        binding.references.forEach(function (node) {
            if (node.type === 'declaration') {
                node.identifier.identifier = mangle(node.identifier.identifier, node);
            }
            else if (node.type === 'identifier') {
                node.identifier = mangle(node.identifier, node);
            }
            else if (node.type === 'parameter_declaration' && node.identifier) {
                node.identifier.identifier = mangle(node.identifier.identifier, node);
                /* Ignore case of:
                layout(std140,column_major) uniform;
                uniform Material
                {
                uniform vec2 prop;
                }
                 */
            }
            else if (node.type !== 'interface_declarator') {
                console.warn('Unknown binding node', node);
                throw new Error("Binding for type ".concat(node.type, " not recognized"));
            }
        });
    });
};
export var renameTypes = function (scope, mangle) {
    Object.entries(scope.types).forEach(function (_a) {
        var name = _a[0], type = _a[1];
        type.references.forEach(function (node) {
            if (node.type === 'type_name') {
                node.identifier = mangle(node.identifier, node);
            }
            else {
                console.warn('Unknown type node', node);
                throw new Error("Type ".concat(node.type, " not recognized"));
            }
        });
    });
};
export var renameFunctions = function (scope, mangle) {
    Object.entries(scope.functions).forEach(function (_a) {
        var fnName = _a[0], overloads = _a[1];
        Object.entries(overloads).forEach(function (_a) {
            var signature = _a[0], overload = _a[1];
            overload.references.forEach(function (node) {
                if (node.type === 'function') {
                    node['prototype'].header.name.identifier = mangle(node['prototype'].header.name.identifier, node);
                }
                else if (node.type === 'function_call' &&
                    node.identifier.type === 'postfix') {
                    // @ts-ignore
                    var specifier = node.identifier.expression.identifier.specifier;
                    if (specifier) {
                        specifier.identifier = mangle(specifier.identifier, node);
                    }
                    else {
                        console.warn('Unknown function node to rename', node);
                        throw new Error("Function specifier type ".concat(node.type, " not recognized"));
                    }
                }
                else if (node.type === 'function_call' &&
                    'specifier' in node.identifier &&
                    'identifier' in node.identifier.specifier) {
                    node.identifier.specifier.identifier = mangle(node.identifier.specifier.identifier, node);
                }
                else if (node.type === 'function_call' &&
                    node.identifier.type === 'identifier') {
                    node.identifier.identifier = mangle(node.identifier.identifier, node);
                }
                else {
                    console.warn('Unknown function node to rename', node);
                    throw new Error("Function for type ".concat(node.type, " not recognized"));
                }
            });
        });
    });
};
export var xor = function (a, b) { return (a || b) && !(a && b); };
