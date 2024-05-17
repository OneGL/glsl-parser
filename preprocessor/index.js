import generate from './generator.js';
import { preprocessAst, preprocessComments, visitPreprocessedAst, } from './preprocessor.js';
// This index file is currently only for package publishing, where the whole
// library exists in the dist/ folder, so the below import is relative to dist/
import * as parser from './preprocessor-parser.js';
// Should this be in a separate file? There's no tests for it either
var preprocess = function (src, options) {
    return generate(preprocessAst(parser.parse(options.preserveComments ? src : preprocessComments(src)), options));
};
export default preprocess;
export { preprocessAst, preprocessComments, generate, preprocess, parser, visitPreprocessedAst };
