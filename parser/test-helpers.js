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
import { execSync } from 'child_process';
import util from 'util';
import generate from './generator.js';
export var inspect = function (arg) {
    return console.log(util.inspect(arg, false, null, true));
};
export var nextWarn = function () {
    console.warn = jest.fn();
    var i = 0;
    // @ts-ignore
    var mock = console.warn.mock;
    return function () { return mock.calls[i++][0]; };
};
export var buildParser = function () {
    execSync('npx peggy --cache --format es -o src/parser/parser.js src/parser/glsl-grammar.pegjs');
    var parser = require('./parser');
    var parse = parser.parse;
    var ps = parseSrc(parse);
    var ctx = {
        parse: parse,
        parseSrc: ps,
    };
    return {
        parse: parse,
        parser: parser,
        parseSrc: ps,
        debugSrc: debugSrc(ctx),
        debugStatement: debugStatement(ctx),
        expectParsedStatement: expectParsedStatement(ctx),
        parseStatement: parseStatement(ctx),
        expectParsedProgram: expectParsedProgram(ctx),
    };
};
// Keeping this around in case I need to figure out how to do tracing again
// Most of this ceremony around building a parser is dealing with Peggy's error
// format() function, where the grammarSource has to line up in generate() and
// format() to get nicely formatted errors if there's a syntax error in the
// grammar
// const buildParser = (file: string) => {
//   const grammar = fileContents(file);
//   try {
//     return peggy.generate(grammar, {
//       grammarSource: file,
//       cache: true,
//       trace: false,
//     });
//   } catch (e) {
//     const err = e as SyntaxError;
//     if ('format' in err && typeof err.format === 'function') {
//       console.error(err.format([{ source: file, text: grammar }]));
//     }
//     throw e;
//   }
// };
export var debugEntry = function (bindings) {
    return Object.entries(bindings).map(function (_a) {
        var k = _a[0], v = _a[1];
        return "".concat(k, ": (").concat(v.references.length, " references, ").concat(v.declaration ? '' : 'un', "declared): ").concat(v.references.map(function (r) { return r.type; }).join(', '));
    });
};
export var debugFunctionEntry = function (bindings) {
    return Object.entries(bindings).flatMap(function (_a) {
        var name = _a[0], overloads = _a[1];
        return Object.entries(overloads).map(function (_a) {
            var signature = _a[0], overload = _a[1];
            return "".concat(name, " (").concat(signature, "): (").concat(overload.references.length, " references, ").concat(overload.declaration ? '' : 'un', "declared): ").concat(overload.references.map(function (r) { return r.type; }).join(', '));
        });
    });
};
export var debugScopes = function (astOrScopes) {
    return console.log('Scopes:', 'scopes' in astOrScopes
        ? astOrScopes.scopes
        : astOrScopes.map(function (s) { return ({
            name: s.name,
            types: debugEntry(s.types),
            bindings: debugEntry(s.bindings),
            functions: debugFunctionEntry(s.functions),
        }); }));
};
var middle = /\/\* start \*\/((.|[\r\n])+)(\/\* end \*\/)?/m;
var parseSrc = function (parse) { return function (src, options) {
    if (options === void 0) { options = {}; }
    var grammarSource = '<anonymous glsl>';
    try {
        return parse(src, __assign(__assign({}, options), { grammarSource: grammarSource, tracer: {
                trace: function (type) {
                    if (type.type === 'rule.match' &&
                        type.rule !== 'whitespace' &&
                        type.rule !== 'single_comment' &&
                        type.rule !== 'comment' &&
                        type.rule !== 'digit_sequence' &&
                        type.rule !== 'digit' &&
                        type.rule !== 'fractional_constant' &&
                        type.rule !== 'floating_constant' &&
                        type.rule !== 'translation_unit' &&
                        type.rule !== 'start' &&
                        type.rule !== 'external_declaration' &&
                        type.rule !== 'SEMICOLON' &&
                        type.rule !== 'terminal' &&
                        type.rule !== '_') {
                        if (type.rule === 'IDENTIFIER' || type.rule === 'TYPE_NAME') {
                            console.log('\x1b[35mMatch literal\x1b[0m', type.rule, type.result);
                        }
                        else {
                            console.log('\x1b[35mMatch\x1b[0m', type.rule);
                        }
                    }
                    // if (type.type === 'rule.fail') {
                    //   console.log('fail', type.rule);
                    // }
                },
            } }));
    }
    catch (e) {
        var err = e;
        if ('format' in err) {
            console.error(err.format([{ source: grammarSource, text: src }]));
        }
        console.error("Error parsing lexeme!\n\"".concat(src, "\""));
        throw err;
    }
}; };
var debugSrc = function (_a) {
    var parseSrc = _a.parseSrc;
    return function (src) {
        inspect(parseSrc(src).program);
    };
};
var debugStatement = function (_a) {
    var parseSrc = _a.parseSrc;
    return function (stmt) {
        var program = "void main() {/* start */".concat(stmt, "/* end */}");
        var ast = parseSrc(program);
        inspect(ast.program[0].body.statements[0]);
    };
};
var expectParsedStatement = function (_a) {
    var parseSrc = _a.parseSrc;
    return function (src, options) {
        if (options === void 0) { options = {}; }
        var program = "void main() {/* start */".concat(src, "/* end */}");
        var ast = parseSrc(program, options);
        var glsl = generate(ast);
        if (glsl !== program) {
            inspect(ast.program[0]);
            // @ts-ignore
            expect(glsl.match(middle)[1]).toBe(src);
        }
    };
};
var parseStatement = function (_a) {
    var parseSrc = _a.parseSrc;
    return function (src, options) {
        if (options === void 0) { options = {}; }
        var program = "void main() {".concat(src, "}");
        return parseSrc(program, options);
    };
};
var expectParsedProgram = function (_a) {
    var parseSrc = _a.parseSrc;
    return function (src, options) {
        var ast = parseSrc(src, options);
        var glsl = generate(ast);
        if (glsl !== src) {
            inspect(ast);
            expect(glsl).toBe(src);
        }
    };
};
