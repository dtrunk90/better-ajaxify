module.exports = function(config) {
    "use strict";

    config.set({
        basePath: "..",
        frameworks: ["jasmine-ajax", "jasmine"],
        browsers: ["PhantomJS"],
        preprocessors: { "src/better-ajaxify.js": "coverage" },
        files: [
            "node_modules/jasmine-ajax/lib/mock-ajax.js",
            "bower_components/better-dom/dist/better-dom-legacy.js",
            "bower_components/better-dom/dist/better-dom.js",
            "bower_components/promise-polyfill/Promise.js",
            "bower_components/better-xhr/dist/better-xhr.js",
            "src/*.js",
            "test/spec/*.spec.js"
        ]
    });
};
