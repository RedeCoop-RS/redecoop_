const tsConfig = require('./tsconfig.base.json');
const tsConfigPaths = require('tsconfig-paths');

const baseUrl = './dist';
tsConfigPaths.register({
  baseUrl,
  paths: tsConfig.compilerOptions.paths,
});