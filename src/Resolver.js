// @flow
const promisify = require('./utils/promisify');
const resolve = require('browser-resolve');
const resolveAsync = promisify(resolve);
const builtins = require('./builtins');
const path = require('path');
const glob = require('glob');
import type {Extensions} from './types';

export type ResolverOptions = {
  extensions?: Extensions,
  paths?: Array<string>
};

class Resolver {
  options: ResolverOptions;
  cache: Map<any, any>;

  constructor(options: ResolverOptions = {}) {
    this.options = options;
    this.cache = new Map();
  }

  async resolve(filename: string, parent: string) {
    var resolved = await this.resolveInternal(filename, parent, resolveAsync);
    return this.saveCache(filename, parent, resolved);
  }

  resolveSync(filename: string, parent: string) {
    var resolved = this.resolveInternal(filename, parent, resolve.sync);
    return this.saveCache(filename, parent, resolved);
  }

  resolveInternal(
    filename: string,
    parent: string,
    resolver: (filename: string, {}) => any
  ) {
    let key = this.getCacheKey(filename, parent);
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    if (glob.hasMagic(filename)) {
      return {path: path.resolve(path.dirname(parent), filename)};
    }

    return resolver(filename, {
      filename: parent,
      paths: this.options.paths,
      modules: builtins,
      extensions: Object.keys(this.options.extensions || {}),
      packageFilter(pkg, pkgfile) {
        // Expose the path to the package.json file
        pkg.pkgfile = pkgfile;
        return pkg;
      }
    });
  }

  getCacheKey(filename: string, parent?: string) {
    return (parent ? path.dirname(parent) : '') + ':' + filename;
  }

  saveCache(filename: string, parent?: string, resolved: any) {
    if (Array.isArray(resolved)) {
      resolved = {path: resolved[0], pkg: resolved[1]};
    } else if (typeof resolved === 'string') {
      resolved = {path: resolved, pkg: null};
    }

    this.cache.set(this.getCacheKey(filename, parent), resolved);
    return resolved;
  }
}

module.exports = Resolver;
