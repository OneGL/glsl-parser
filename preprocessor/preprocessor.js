var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { visit } from '../ast/visit.js';
var without = function (obj) {
    var keys = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        keys[_i - 1] = arguments[_i];
    }
    return Object.entries(obj).reduce(function (acc, _a) {
        var _b;
        var key = _a[0], value = _a[1];
        return (__assign(__assign({}, acc), (!keys.includes(key) && (_b = {}, _b[key] = value, _b))));
    }, {});
};
// Scan for the use of a function-like macro, balancing parentheses until
// encountering a final closing ")" marking the end of the macro use
var scanFunctionArgs = function (src) {
    var char;
    var parens = 0;
    var args = [];
    var arg = '';
    for (var i = 0; i < src.length; i++) {
        char = src.charAt(i);
        if (char === '(') {
            parens++;
        }
        if (char === ')') {
            parens--;
        }
        if (parens === -1) {
            // In the case of "()", we don't want to add the argument of empty string,
            // but we do in case of "(,)" and "(asdf)". When we hit the closing paren,
            // only capture the arg of empty string if there was a previous comma,
            // which we can infer from there being a previous arg
            if (arg !== '' || args.length) {
                args.push(arg);
            }
            return { args: args, length: i };
        }
        if (char === ',' && parens === 0) {
            args.push(arg);
            arg = '';
        }
        else {
            arg += char;
        }
    }
    return null;
};
// From glsl2s https://github.com/cimaron/glsl2js/blob/4046611ac4f129a9985d74704159c41a402564d0/preprocessor/comments.js
var preprocessComments = function (src) {
    var i;
    var chr;
    var la;
    var out = '';
    var line = 1;
    var in_single = 0;
    var in_multi = 0;
    for (i = 0; i < src.length; i++) {
        chr = src.substring(i, i + 1);
        la = src.substring(i + 1, i + 2);
        // Enter single line comment
        if (chr == '/' && la == '/' && !in_single && !in_multi) {
            in_single = line;
            i++;
            continue;
        }
        // Exit single line comment
        if (chr == '\n' && in_single) {
            in_single = 0;
        }
        // Enter multi line comment
        if (chr == '/' && la == '*' && !in_multi && !in_single) {
            in_multi = line;
            i++;
            continue;
        }
        // Exit multi line comment
        if (chr == '*' && la == '/' && in_multi) {
            // Treat single line multi-comment as space
            if (in_multi == line) {
                out += ' ';
            }
            in_multi = 0;
            i++;
            continue;
        }
        // Newlines are preserved
        if ((!in_multi && !in_single) || chr == '\n') {
            out += chr;
            line++;
        }
    }
    return out;
};
var tokenPaste = function (str) { return str.replace(/\s+##\s+/g, ''); };
var evaluate = function (ast, evaluators) {
    var visit = function (node) {
        var evaluator = evaluators[node.type];
        if (!evaluator) {
            throw new Error("No evaluate() evaluator for ".concat(node.type));
        }
        // I can't figure out why evalutor has node type never here
        // @ts-ignore
        return evaluator(node, visit);
    };
    return visit(ast);
};
var expandFunctionMacro = function (macros, macroName, macro, text) {
    var pattern = "\\b".concat(macroName, "\\s*\\(");
    var startRegex = new RegExp(pattern, 'm');
    var expanded = '';
    var current = text;
    var startMatch;
    var _loop_1 = function () {
        var result = scanFunctionArgs(current.substring(startMatch.index + startMatch[0].length));
        if (result === null) {
            throw new Error("".concat(current.match(startRegex), " unterminated macro invocation"));
        }
        var macroArgs = (macro.args || []).filter(function (arg) { return arg.literal !== ','; });
        var args = result.args, argLength = result.length;
        // The total length of the raw text to replace is the macro name in the
        // text (startMatch), plus the length of the arguments, plus one to
        // encompass the closing paren that the scan fn skips
        var matchLength = startMatch[0].length + argLength + 1;
        if (args.length > macroArgs.length) {
            throw new Error("'".concat(macroName, "': Too many arguments for macro"));
        }
        if (args.length < macroArgs.length) {
            throw new Error("'".concat(macroName, "': Not enough arguments for macro"));
        }
        var replacedBody = tokenPaste(macroArgs.reduce(function (replaced, macroArg, index) {
            return replaced.replace(new RegExp("\\b".concat(macroArg.identifier, "\\b"), 'g'), args[index].trim());
        }, macro.body));
        // Any text expanded is then scanned again for more replacements. The
        // self-reference rule means that a macro that references itself won't be
        // expanded again, so remove it from the search
        var expandedReplace = expandMacros(replacedBody, without(macros, macroName));
        // We want to break this string at where we finished expanding the macro
        var endOfReplace = startMatch.index + expandedReplace.length;
        // Replace the use of the macro with the expansion
        var processed = current.replace(current.substring(startMatch.index, startMatch.index + matchLength), expandedReplace);
        // Add text up to the end of the expanded macro to what we've procssed
        expanded += processed.substring(0, endOfReplace);
        // Only work on the rest of the text, not what we already expanded. This is
        // to avoid a nested macro #define foo() foo() where we'll try to expand foo
        // forever. With this strategy, we expand foo() to foo() and move on
        current = processed.substring(endOfReplace);
    };
    while ((startMatch = startRegex.exec(current))) {
        _loop_1();
    }
    return expanded + current;
};
var expandObjectMacro = function (macros, macroName, macro, text) {
    var regex = new RegExp("\\b".concat(macroName, "\\b"), 'g');
    var expanded = text;
    if (regex.test(text)) {
        // Macro definitions like
        //     #define MACRO
        // Have null for the body. Make it empty string if null to avoid 'null' expanded
        var replacement = macro.body || '';
        var firstPass = tokenPaste(text.replace(new RegExp("\\b".concat(macroName, "\\b"), 'g'), replacement));
        // Scan expanded text for more expansions. Ignore the expanded macro because
        // of the self-reference rule
        expanded = expandMacros(firstPass, without(macros, macroName));
    }
    return expanded;
};
var expandMacros = function (text, macros) {
    return Object.entries(macros).reduce(function (result, _a) {
        var macroName = _a[0], macro = _a[1];
        return macro.args
            ? expandFunctionMacro(macros, macroName, macro, result)
            : expandObjectMacro(macros, macroName, macro, result);
    }, text);
};
var identity = function (x) { return !!x; };
// Given an expression AST node, visit it to expand the macro macros to in the
// right places
var expandInExpressions = function (macros) {
    var expressions = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        expressions[_i - 1] = arguments[_i];
    }
    expressions.forEach(function (expression) {
        visitPreprocessedAst(expression, {
            unary_defined: {
                enter: function (path) {
                    path.skip();
                },
            },
            identifier: {
                enter: function (path) {
                    path.node.identifier = expandMacros(path.node.identifier, macros);
                },
            },
        });
    });
};
var evaluateIfPart = function (macros, ifPart) {
    if (ifPart.type === 'if') {
        return evaluteExpression(ifPart.expression, macros);
    }
    else if (ifPart.type === 'ifdef') {
        return ifPart.identifier.identifier in macros;
    }
    else if (ifPart.type === 'ifndef') {
        return !(ifPart.identifier.identifier in macros);
    }
};
// TODO: Are all of these operators equivalent between javascript and GLSL?
var evaluteExpression = function (node, macros) {
    return evaluate(node, {
        // TODO: Handle non-base-10 numbers. Should these be parsed in the peg grammar?
        int_constant: function (node) { return parseInt(node.token, 10); },
        unary_defined: function (node) { return node.identifier.identifier in macros; },
        identifier: function (node) { return node.identifier; },
        group: function (node, visit) { return visit(node.expression); },
        binary: function (_a, visit) {
            var left = _a.left, right = _a.right, literal = _a.operator.literal;
            switch (literal) {
                // multiplicative
                case '*': {
                    return visit(left) * visit(right);
                }
                // division
                case '/': {
                    return visit(left) / visit(right);
                }
                // modulo
                case '%': {
                    return visit(left) % visit(right);
                }
                // addition
                case '+': {
                    return visit(left) + visit(right);
                }
                // subtraction
                case '-': {
                    return visit(left) - visit(right);
                }
                // bit-wise shift
                case '<<': {
                    return visit(left) << visit(right);
                }
                // bit-wise shift
                case '>>': {
                    return visit(left) >> visit(right);
                }
                case '<': {
                    return visit(left) < visit(right);
                }
                case '>': {
                    return visit(left) > visit(right);
                }
                case '<=': {
                    return visit(left) <= visit(right);
                }
                case '>=': {
                    return visit(left) >= visit(right);
                }
                case '==': {
                    return visit(left) == visit(right);
                }
                case '!=': {
                    return visit(left) != visit(right);
                }
                // bit-wise and
                case '&': {
                    return visit(left) & visit(right);
                }
                // bit-wise exclusive or
                case '^': {
                    return visit(left) ^ visit(right);
                }
                // bit-wise inclusive or
                case '|': {
                    return visit(left) | visit(right);
                }
                case '&&': {
                    return visit(left) && visit(right);
                }
                case '||': {
                    return visit(left) || visit(right);
                }
                default: {
                    throw new Error("Preprocessing error: Unknown binary operator ".concat(literal));
                }
            }
        },
        unary: function (node, visit) {
            switch (node.operator.literal) {
                case '+': {
                    return visit(node.expression);
                }
                case '-': {
                    return -1 * visit(node.expression);
                }
                case '!': {
                    return !visit(node.expression);
                }
                case '~': {
                    return ~visit(node.expression);
                }
                default: {
                    throw new Error("Preprocessing error: Unknown unary operator ".concat(node.operator.literal));
                }
            }
        },
    });
};
var shouldPreserve = function (preserve) {
    if (preserve === void 0) { preserve = {}; }
    return function (path) {
        var test = preserve === null || preserve === void 0 ? void 0 : preserve[path.node.type];
        return typeof test === 'function' ? test(path) : test;
    };
};
// @ts-ignore
export var visitPreprocessedAst = visit;
var convertPath = function (p) {
    return p;
};
var preprocessAst = function (program, options) {
    if (options === void 0) { options = {}; }
    var macros = Object.entries(options.defines || {}).reduce(function (defines, _a) {
        var _b;
        var name = _a[0], body = _a[1];
        return (__assign(__assign({}, defines), (_b = {}, _b[name] = { body: body }, _b)));
    }, {});
    // const defineValues = { ...options.defines };
    // const { preserve, ignoreMacro } = options;
    var preserve = options.preserve;
    var preserveNode = shouldPreserve(preserve);
    visitPreprocessedAst(program, {
        conditional: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                var node = path.node;
                // TODO: Determining if we need to handle edge case conditionals here
                if (preserveNode(path)) {
                    return;
                }
                // Expand macros in if/else *expressions* only. Macros are expanded in:
                //     #if X + 1
                //     #elif Y + 2
                // But *not* in
                //     # ifdef X
                // Because X should not be expanded in the ifdef. Note that
                //     # if defined(X)
                // does have an expression, but the skip() in unary_defined prevents
                // macro expansion in there. Checking for .expression and filtering out
                // any conditionals without expressions is how ifdef is avoided.
                // It's not great that ifdef is skipped differentaly than defined().
                expandInExpressions.apply(void 0, __spreadArray([macros], __spreadArray([
                    node.ifPart.expression
                ], node.elseIfParts.map(function (elif) { return elif.expression; }), true).filter(identity), false));
                if (evaluateIfPart(macros, node.ifPart)) {
                    path.replaceWith(node.ifPart.body);
                    // Keeping this commented out block in case I can find a way to
                    // conditionally evaluate shaders
                    // path.replaceWith({
                    //   ...node,
                    //   ifPart: node.ifPart.body,
                    //   elsePart: null,
                    //   endif: null,
                    //   wsEnd: null, // Remove linebreak after endif
                    // });
                }
                else {
                    var elseBranchHit = node.elseIfParts.reduce(function (res, elif) {
                        return res ||
                            (evaluteExpression(elif.expression, macros) &&
                                // path/visit hack to remove type error
                                (path.replaceWith(elif.body), true));
                    }, false);
                    if (!elseBranchHit) {
                        if (node.elsePart) {
                            path.replaceWith(node.elsePart.body);
                        }
                        else {
                            path.remove();
                        }
                    }
                }
            },
        },
        text: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                path.node.text = expandMacros(path.node.text, macros);
            },
        },
        define_arguments: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                var _a = path.node, identifier = _a.identifier.identifier, body = _a.body, args = _a.args;
                macros[identifier] = { args: args, body: body };
                !preserveNode(path) && path.remove();
            },
        },
        define: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                var _a = path.node, identifier = _a.identifier.identifier, body = _a.body;
                // TODO: Abandoning this for now until I know more concrete use cases
                // const shouldIgnore = ignoreMacro?.(identifier, body);
                // defineValues[identifier] = body;
                // if (!shouldIgnore) {
                macros[identifier] = { body: body };
                !preserveNode(path) && path.remove();
                // }
            },
        },
        undef: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                delete macros[path.node.identifier.identifier];
                !preserveNode(path) && path.remove();
            },
        },
        error: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                if (options.stopOnError) {
                    throw new Error(path.node.message);
                }
                !preserveNode(path) && path.remove();
            },
        },
        pragma: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                !preserveNode(path) && path.remove();
            },
        },
        version: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                !preserveNode(path) && path.remove();
            },
        },
        extension: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                !preserveNode(path) && path.remove();
            },
        },
        // TODO: Causes a failure
        line: {
            enter: function (initialPath) {
                var path = convertPath(initialPath);
                !preserveNode(path) && path.remove();
            },
        },
    });
    // Even though it mutates, useful for passing around functions
    return program;
};
export { preprocessAst, preprocessComments };
