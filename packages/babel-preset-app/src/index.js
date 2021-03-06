const defaultPolyfills = [
  // Promise polyfill alone doesn't work in IE,
  // Needs this as well. see: #1642
  'es6.array.iterator',
  // This is required for webpack code splitting, vuex etc.
  'es6.promise',
  // this is needed for object rest spread support in templates
  // as vue-template-es2015-compiler 1.8+ compiles it to Object.assign() calls.
  'es6.object.assign',
  // #2012 es7.promise replaces native Promise in FF and causes missing finally
  'es7.promise.finally'
]

function getPolyfills(targets, includes, { ignoreBrowserslistConfig, configPath }) {
  const { isPluginRequired } = require('@babel/preset-env')
  const builtInsList = require('@babel/preset-env/data/built-ins.json.js')
  const getTargets = require('@babel/preset-env/lib/targets-parser').default
  const builtInTargets = getTargets(targets, {
    ignoreBrowserslistConfig,
    configPath
  })

  return includes.filter(item => isPluginRequired(builtInTargets, builtInsList[item]))
}

module.exports = (context, options = {}) => {
  const presets = []
  const plugins = []

  const modern = !!options.modern

  const {
    polyfills: userPolyfills,
    buildTarget,
    loose = false,
    debug = false,
    useBuiltIns = 'usage',
    modules = false,
    spec,
    ignoreBrowserslistConfig = modern,
    configPath,
    include,
    exclude,
    shippedProposals,
    forceAllTransforms,
    decoratorsBeforeExport,
    decoratorsLegacy,
    absoluteRuntime
  } = options

  let { targets } = options
  if (modern === true) {
    targets = { esmodules: true }
  } else if (targets === undefined && typeof buildTarget === 'string') {
    targets = buildTarget === 'server' ? { node: 'current' } : { ie: 9 }
  }

  let polyfills
  if (modern === false && useBuiltIns === 'usage' && buildTarget === 'client') {
    polyfills = getPolyfills(targets, userPolyfills || defaultPolyfills, {
      ignoreBrowserslistConfig,
      configPath
    })
    plugins.push([require('./polyfills-plugin'), { polyfills }])
  } else {
    polyfills = []
  }

  const corejs = { version: 2 }

  // Pass options along to babel-preset-env
  presets.push([
    require('@babel/preset-env'), {
      spec,
      loose,
      debug,
      modules,
      targets,
      useBuiltIns,
      corejs,
      ignoreBrowserslistConfig,
      configPath,
      include,
      exclude: polyfills.concat(exclude || []),
      shippedProposals,
      forceAllTransforms
    }
  ])

  // JSX
  if (options.jsx !== false) {
    presets.push([require('@vue/babel-preset-jsx'), Object.assign({}, options.jsx)])
  }

  plugins.push(
    require('@babel/plugin-syntax-dynamic-import'),
    [require('@babel/plugin-proposal-decorators'), {
      decoratorsBeforeExport,
      legacy: decoratorsLegacy !== false
    }],
    [require('@babel/plugin-proposal-class-properties'), { loose }]
  )

  // Transform runtime, but only for helpers
  plugins.push([require('@babel/plugin-transform-runtime'), {
    regenerator: useBuiltIns !== 'usage',
    corejs: useBuiltIns !== false ? false : corejs,
    helpers: useBuiltIns === 'usage',
    useESModules: buildTarget !== 'server',
    absoluteRuntime
  }])

  return {
    presets,
    plugins
  }
}
