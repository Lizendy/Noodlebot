const gulp = require("gulp"),
      header = require("gulp-header"),
      footer = require("gulp-footer"),
      rename = require("gulp-rename"),
      uglify = require("gulp-uglify"),
      browserify = require("browserify"),
      source = require("vinyl-source-stream"),
      buffer = require("vinyl-buffer"),
      _ = require("lodash"),
      generateUserscriptHeader = require("generate-userscript-header");

const pkg = require("./package.json");
const safeName = _.camelCase(pkg.name);

gulp.task("browserify", function () {
    const pluginInfo = [
        "var <%= safeName %> = window.<%= safeName %> = window.<%= safeName %>.default;",
        "<%= safeName %>.prototype.getName = function () { return <% print(JSON.stringify(pkg.name)) %>; };",
        "<%= safeName %>.prototype.getAuthor = function () { return <% print(JSON.stringify(pkg.author)) %>; };",
        "<%= safeName %>.prototype.getVersion = function () { return <% print(JSON.stringify(pkg.version)) %>; };",
        "<%= safeName %>.prototype.getDescription = function () { return <% print(JSON.stringify(pkg.description)) %>; };",
        "",
    ].join("\n");

    return browserify("./src/js/main.js", {standalone: safeName})
        .transform("strictify")
        .transform("babelify", {plugins: ["lodash"], presets: ["es2015"]})
        .bundle()
        .pipe(source("KawaiiDiscord.bundle.js"))
        .pipe(buffer())
        .pipe(footer(pluginInfo, {pkg, safeName}))
        .pipe(uglify())
        .pipe(gulp.dest("./build"));
});

gulp.task("userscript", ["browserify"], function () {
    const bootstrap = [
        "(function (plugin) { var p = new plugin(); p.load(); p.start(); })(<%= safeName %>);",
    ].join("");

    return gulp.src("./build/KawaiiDiscord.bundle.js")
        .pipe(rename("KawaiiDiscord.user.js"))
        .pipe(footer(bootstrap, {safeName}))
        .pipe(header(generateUserscriptHeader(pkg.userscript, {pkg})))
        .pipe(gulp.dest(""));
});

gulp.task("bdplugin", ["browserify"], function () {
    const bdPluginHeader = "//META<% print(JSON.stringify({name: safeName})) %>*//\n\n";

    return gulp.src("./build/KawaiiDiscord.bundle.js")
        .pipe(rename("KawaiiDiscord.plugin.js"))
        .pipe(header(bdPluginHeader, {pkg, safeName}))
        .pipe(gulp.dest(""));
});

gulp.task("default", ["userscript", "bdplugin"]);
