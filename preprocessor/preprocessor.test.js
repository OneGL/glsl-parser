import fs from 'fs';
import peggy from 'peggy';
import util from 'util';
import { preprocessComments, preprocessAst, } from './preprocessor.js';
import generate from './generator.js';
var fileContents = function (filePath) {
    return fs.readFileSync(filePath).toString();
};
var grammar = fileContents('./src/preprocessor/preprocessor-grammar.pegjs');
var parser = peggy.generate(grammar, { cache: true });
var parse = function (src) { return parser.parse(src); };
var debugProgram = function (program) {
    debugAst(parse(program));
};
var debugAst = function (ast) {
    console.log(util.inspect(ast, false, null, true));
};
var expectParsedProgram = function (sourceGlsl) {
    var ast = parse(sourceGlsl);
    var glsl = generate(ast);
    if (glsl !== sourceGlsl) {
        debugAst(ast);
        expect(glsl).toBe(sourceGlsl);
    }
};
// test('pre test file', () => {
//   expectParsedProgram(fileContents('./preprocess-test-grammar.glsl'));
// });
test('#preprocessComments', function () {
    // Should strip comments and replace single-line comments with a single space
    expect(preprocessComments("// ccc\n/* cc */aaa/* cc */\n/**\n * cccc\n */\nbbb\n")).toBe("\n aaa \n\n\n\nbbb\n");
});
test('preprocessor error', function () {
    var error;
    try {
        parse("#if defined(#)");
    }
    catch (e) {
        error = e;
    }
    expect(error).toBeInstanceOf(parser.SyntaxError);
    expect(error.location.start.line).toBe(1);
    expect(error.location.end.line).toBe(1);
});
test('preprocessor ast', function () {
    expectParsedProgram("\n#line 0\n#version 100 \"hi\"\n#define GL_es_profile 1\n#extension all : disable\n#error whoopsie\n#define A 1\nbefore if\n      #if A == 1 || B == 2\n      inside if\n      #define A\n          #elif A == 1 || defined B && C == 2\n          float a;\n          #elif A == 1 || defined(B) && C == 2\n          float a;\n      #define B\n      #endif\noutside endif\n#pragma mypragma: something(else)\nfinal line after program\n");
});
test('nested expand macro', function () {
    var program = "#define X Y\n#define Y Z\nX";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("Z");
});
test('binary evaluation', function () {
    var program = "\n#if 1 + 1 > 0\ntrue\n#endif\n";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\ntrue\n");
});
test('ifdef inside else is properly expanded', function () {
    // Regression: Make sure #ifdef MACRO inside #else isn't expanded
    var program = "\n#define MACRO\n#ifdef NOT_DEFINED\n  false\n#else\n  #ifdef MACRO\n____true\n  #endif\n#endif\n";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\n____true\n");
});
test('macro without body becoms empty string', function () {
    // There is intentionally whitespace after MACRO to make sure it doesn't apply
    // to the expansion-to-nothing
    var program = "\n#define MACRO   \nfn(MACRO);\n";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nfn();\n");
});
test('if expression', function () {
    var program = "\n#define A\nbefore if\n#if !defined(A) && (defined(B) && C == 2)\ninside first if\n#endif\n#if ((defined B && C == 2) || defined(A))\ninside second if\n#endif\nafter if\n";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nbefore if\ninside second if\nafter if\n");
});
test('evaluate if branch', function () {
    var program = "\n#define A\nbefore if\n#if defined(A)\ninside if\n#endif\nafter if\n";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nbefore if\ninside if\nafter if\n");
});
test('evaluate elseif branch', function () {
    var program = "\n#define A\nbefore if\n#if defined(B)\ninside if\n#elif defined(A)\ninside elif\n#else\nelse body\n#endif\nafter if";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nbefore if\ninside elif\nafter if");
});
test('empty branch', function () {
    var program = "before if\n#ifdef GL_ES\nprecision mediump float;\n#endif\nafter if";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("before if\nafter if");
});
test('evaluate else branch', function () {
    var program = "\n#define A\nbefore if\n#if defined(D)\ninside if\n#elif defined(E)\ninside elif\n#else\nelse body\n#endif\nafter if";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nbefore if\nelse body\nafter if");
});
test('self referential object macro', function () {
    var program = "\n#define first first second\n#define second first\nsecond";
    // If this has an infinte loop, the test will never finish
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nfirst second");
});
test('self referential function macro', function () {
    var program = "\n#define foo() foo()\nfoo()";
    // If this has an infinte loop, the test will never finish
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nfoo()");
});
test('self referential macro combinations', function () {
    var program = "\n#define b c\n#define first(a,b) a + b\n#define second first(1,b)\nsecond";
    // If this has an infinte loop, the test will never finish
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\n1 + c");
});
test("function call macro isn't expanded", function () {
    var program = "\n#define foo() no expand\nfoo";
    var ast = parse(program);
    // debugAst(ast);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nfoo");
});
test("macro that isn't macro function call call is expanded", function () {
    var program = "\n#define foo () yes expand\nfoo";
    var ast = parse(program);
    // debugAst(ast);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\n() yes expand");
});
test('unterminated macro function call', function () {
    var program = "\n#define foo() yes expand\nfoo(\nfoo()";
    var ast = parse(program);
    expect(function () { return preprocessAst(ast); }).toThrow('foo( unterminated macro invocation');
});
test('macro function calls with no arguments', function () {
    var program = "\n#define foo() yes expand\nfoo()\nfoo\n()";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nyes expand\nyes expand");
});
test('macro function calls with bad arguments', function () {
    expect(function () {
        preprocessAst(parse("\n      #define foo( a, b ) a + b\n      foo(1,2,3)"));
    }).toThrow("'foo': Too many arguments for macro");
    expect(function () {
        preprocessAst(parse("\n      #define foo( a ) a + b\n      foo(,)"));
    }).toThrow("'foo': Too many arguments for macro");
    expect(function () {
        preprocessAst(parse("\n      #define foo( a, b ) a + b\n      foo(1)"));
    }).toThrow("'foo': Not enough arguments for macro");
});
test('macro function calls with arguments', function () {
    var program = "\n#define foo( a, b ) a + b\nfoo(x + y, (z-t + vec3(0.0, 1.0)))\nfoo\n(q,\nr)\nfoo(,)";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\nx + y + (z-t + vec3(0.0, 1.0))\nq + r\n + ");
});
test('nested function macro expansion', function () {
    var program = "\n#define X Z\n#define foo(x, y) x + y\nfoo (foo (a, X), c)";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\na + Z + c");
});
test('token pasting', function () {
    var program = "\n#define COMMAND(NAME)  { NAME, NAME ## _command ## x ## y }\nCOMMAND(x)";
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\n{ x, x_commandxy }");
});
test('preservation', function () {
    var program = "\n#line 0\n#version 100 \"hi\"\n#define GL_es_profile 1\n#extension all : disable\n#error whoopsie\n#define  A 1\nbefore if\n#if A == 1 || B == 2\ninside if\n#define A\n#elif A == 1 || defined(B) && C == 2\nfloat a;\n#define B\n#endif\noutside endif\n#pragma mypragma: something(else)\nfunction_call line after program";
    var ast = parse(program);
    preprocessAst(ast, {
        // ignoreMacro: (identifier, body) => {
        //   // return identifier === 'A';
        // },
        preserve: {
            conditional: function () { return false; },
            line: function () { return true; },
            error: function () { return true; },
            extension: function () { return true; },
            pragma: function () { return true; },
            version: function () { return true; },
        },
    });
    expect(generate(ast)).toBe("\n#line 0\n#version 100 \"hi\"\n#extension all : disable\n#error whoopsie\nbefore if\ninside if\noutside endif\n#pragma mypragma: something(else)\nfunction_call line after program");
});
test('different line breaks character', function () {
    var program = '#ifndef x\rfloat a = 1.0;\r\n#endif';
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe('float a = 1.0;\r\n');
});
test('generate #ifdef & #ifndef & #else', function () {
    expectParsedProgram("\n#ifdef AA\n  float a;\n#else\n  float b;\n#endif\n\n#ifndef CC\n  float c;\n#endif\n\n#if AA == 2\n  float d;\n#endif\n");
});
test('test macro with "defined" at start of name', function () {
    var program = "\n#define definedX 1\n#if defined(definedX) && defined definedX && definedX \ntrue\n#endif\n";
    expectParsedProgram(program);
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\ntrue\n");
});
test('inline comments in if statement expression', function () {
    var program = "\n#define AAA\n#define BBB\n#if defined/**/AAA && defined/**/ BBB\ntrue\n#endif\n";
    expectParsedProgram(program);
    var ast = parse(program);
    preprocessAst(ast);
    expect(generate(ast)).toBe("\ntrue\n");
});
/*
test('debug', () => {
  const program = `
precision highp float;
precision mediump int;
precision lowp int;
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
varying vec2 vUv;
`);
});
*/
