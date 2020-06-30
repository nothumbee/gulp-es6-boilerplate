import { src, dest, task, watch, series, parallel } from "gulp";

// CSS related plugins
import sass from "gulp-sass";
import autoprefixer from "gulp-autoprefixer";
import cssimport from "gulp-cssimport";

// JS related plugins
import uglify from "gulp-uglify";
import babelify from "babelify";
import browserify from "browserify";
import source from "vinyl-source-stream";
import buffer from "vinyl-buffer";
import stripDebug from "gulp-strip-debug";

// Utility plugins
import rename from "gulp-rename";
import sourcemaps from "gulp-sourcemaps";
import plumber from "gulp-plumber";
import options from "gulp-options";
import gulpif from "gulp-if";
import del from "del";
import imagemin from "gulp-imagemin";
import log from "fancy-log";

// FTP Deploy
import credentials from "./ftpCredentials";
import ftp from "vinyl-ftp";

// Browser related plugins
const browserSync = require("browser-sync").create();

// Project related constants
const styleSRC = "./src/styles/global.scss";
const styleURL = "./dist/css/";
const mapURL = "./";

const jsSRC = "./src/scripts/";
const jsFront = "global.js";
const jsFiles = [jsFront, "extraFile.js"];
const jsURL = "./dist/js/";

const imgSRC = "./src/assets/**/*";
const imgURL = "./dist/assets/";

const fontsSRC = "./src/fonts/**/*";
const fontsURL = "./dist/fonts/";

const htmlSRC = "./src/**/*.html";
const htmlURL = "./dist/";

const styleWatch = "./src/styles/**/*.scss";
const jsWatch = "./src/scripts/**/*.js";
const imgWatch = "./src/assets/**/*.*";
const fontsWatch = "./src/fonts/**/*.*";
const htmlWatch = "./src/**/*.html";

// Tasks
const clean = () => del(["./dist/"]);

const browser_sync = () => {
  browserSync.init({
    server: {
      baseDir: "./dist/",
    },
    open: false,
  });
};

const reload = (done) => {
  browserSync.reload();
  done();
};

const css = (done) => {
  src([styleSRC])
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        errLogToConsole: true,
        outputStyle: "compressed",
      })
    )
    .on("error", console.error.bind(console))
    .pipe(cssimport({}))
    .pipe(autoprefixer())
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write(mapURL))
    .pipe(dest(styleURL))
    .pipe(browserSync.stream());
  done();
};

const js = (done) => {
  jsFiles.map((entry) => {
    browserify({
      entries: [jsSRC + entry],
    })
      .transform(babelify, { presets: ["@babel/preset-env"] })
      .bundle()
      .pipe(source(entry))
      .pipe(
        rename({
          extname: ".min.js",
        })
      )
      .pipe(buffer())
      .pipe(gulpif(options.has("production"), stripDebug()))
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(gulpif(options.has("production"), uglify()))
      .pipe(sourcemaps.write("."))
      .pipe(dest(jsURL))
      .pipe(browserSync.stream());
  });
  done();
};

const deploy = (done) => {
  const { host, user, password, remotePath = "/" } = credentials;
  const conn = ftp.create({
    host,
    user,
    password,
    log,
  });
  src(["./dist/**/*.*"]).pipe(conn.newer(remotePath)).pipe(conn.dest(remotePath));
  done();
};

const triggerPlumber = (src_file, dest_file) => {
  return src(src_file).pipe(plumber()).pipe(dest(dest_file));
};

const images = () => {
  return src(imgSRC)
    .pipe(plumber())
    .pipe(
      imagemin([
        imagemin.svgo({
          plugins: [{ removeViewBox: false }, { cleanupIDs: false }],
        }),
      ])
    )
    .pipe(dest(imgURL));
};

const fonts = () => {
  return triggerPlumber(fontsSRC, fontsURL);
};

const html = () => {
  return triggerPlumber(htmlSRC, htmlURL);
};

const watch_files = () => {
  watch(styleWatch, series(css, reload));
  watch(jsWatch, series(js, reload));
  watch(imgWatch, series(images, reload));
  watch(fontsWatch, series(fonts, reload));
  watch(htmlWatch, series(html, reload));
  src(jsURL + "global.min.js", { allowEmpty: true });
};

task("clean", clean);
task("css", css);
task("js", js);
task("images", images);
task("fonts", fonts);
task("html", html);
task("default", series(clean, parallel(css, js, images, fonts, html)));
task("deploy", series("default", deploy));
task("watch", parallel(browser_sync, watch_files));
