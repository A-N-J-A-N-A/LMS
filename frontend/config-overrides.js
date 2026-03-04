module.exports = function override(config, env) {
  // Disable source-map-loader for @tanstack/react-query
  config.module.rules = config.module.rules.map(rule => {
    if (rule.enforce === 'pre' && rule.use && rule.use[0]?.loader === 'source-map-loader') {
      return {
        ...rule,
        exclude: [
          rule.exclude || [],
          /node_modules\/@tanstack\/react-query/,
        ].flat(),
      };
    }
    return rule;
  });
  return config;
};
