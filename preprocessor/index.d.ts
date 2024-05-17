import generate from './generator.js';
import { preprocessAst, preprocessComments, PreprocessorOptions, visitPreprocessedAst } from './preprocessor.js';
import * as parser from './preprocessor-parser.js';
declare const preprocess: (src: string, options: PreprocessorOptions) => string;
export default preprocess;
export { preprocessAst, preprocessComments, generate, preprocess, parser, visitPreprocessedAst };
