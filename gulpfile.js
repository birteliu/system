"use strict";

// Load plugins
const gulp = require("gulp");
const slash = require('slash');
const autoprefixer = require("autoprefixer");
const pug = require("gulp-pug");
const browsersync = require("browser-sync").create();
const del = require("del");
const imagemin = require("gulp-imagemin");
const newer = require("gulp-newer");
const plumber = require("gulp-plumber");
const postcss = require("gulp-postcss");
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require("gulp-sourcemaps");
const notify = require('gulp-notify');
const nunjucksRender = require("gulp-nunjucks-render");



// BrowserSync
function browserSync(done) {
  browsersync.init({
    server: {
      baseDir: "dist"
    },
    port: 3000
  });
  done();
}

// BrowserSync Reload
// function browserSyncReload(done) {
//   browsersync.reload();
//   done();
// }

// Clean task
function clean() {

  return del(["dist"], {
    force: true
  });
  //return del(["dist"]);
}

// Images task
function images() {
  return gulp
    .src("src/images/*")
    .pipe(newer("dist/images"))
    .pipe(
      imagemin([
        imagemin.gifsicle({
          interlaced: true
        }),
        //jpegtran is replaced by mozjpeg in new release by猫
        imagemin.mozjpeg({
          progressive: true
        }),
        imagemin.optipng({
          optimizationLevel: 5
        }),
        imagemin.svgo({
          plugins: [{
            removeViewBox: false,
            collapseGroups: true
          }]
        })
      ])
    )
    .pipe(gulp.dest("dist/images"));
}

// CSS task
function css() {
  return gulp.src("src/scss/*.*")
    .pipe(plumber({
      errorHandler: notify.onError("Error: <%= error.message %>")
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: "expanded" //nested | expanded | compact | compressed
    }))
    .pipe(postcss([require('autoprefixer')])) //終於塞回去了 https://github.com/postcss/postcss#gulp
    .pipe(sourcemaps.write("/"))
    .pipe(gulp.dest("dist/css"))
    .pipe(browsersync.stream())
  // .pipe(rename({
  //   suffix: ".min"
  // }))
}

// nunjucksRender
const layout = (file) => () => {
  if (file) {
    const folder = ((String(file)).substring(0, String(file).lastIndexOf('/')) + "/").replace('src/', '')
    // 針對單一檔案更新
    return gulp
      .src(file)
      .pipe(
        nunjucksRender({
          path: ["src/templates"]
        })
      )
      .pipe(gulp.dest("dist/" + folder))
      .pipe(browsersync.stream());
  } else {
    // 所有檔案更新
    return gulp
      .src("src/**/*.html")
      .pipe(
        nunjucksRender({
          path: ["src/templates"]
        })
      )
      .pipe(gulp.dest("dist/"))
      .pipe(browsersync.stream());
  }

}

// js task
function scripts() {
  return (
    gulp
    .src(["src/js/**/*"])
    .pipe(plumber())
    // folder only, filename is specified in webpack config
    .pipe(gulp.dest("dist/js/"))
    .pipe(browsersync.stream())
  );
}
// 複製並同步
function copy() {
  // 如果 不想讓js複製進wwwroot可以改成這行
  return gulp.src(["dist/**", "!dist/**/*.html","!dist/js/**"]).pipe(gulp.dest("../../wwwroot"));
  // return gulp.src(["dist/**", "!dist/**/*.html", "!dist/js/**", "!dist/templates/**", "!dist/css/*.map"]).pipe(gulp.dest("../wwwroot"));
}

// 複製並同步
function copyImages() {
  return gulp.src(["dist/images/**"]).pipe(gulp.dest("../../wwwroot/images"));
}

// 複製並同步
function copyjs() {
  return gulp.src(["dist/js/**"]).pipe(gulp.dest("../../wwwroot/js"));
}

// 複製並同步
function copyCss() {
  return gulp.src(["dist/css/**"]).pipe(gulp.dest("../../wwwroot/css"));
}


// 複製並同步
function copyHtml() {
  return gulp.src(["dist/**", "!dist/images/**", "!dist/js/**", "!dist/css/**"]).pipe(gulp.dest("../wwwroot"));
}


//專案前基礎複製 
function basisCopy() {
  return gulp.src("src/fonts/*").pipe(gulp.dest("dist/fonts"));
}




// Watch files
function watchFiles() {
  gulp.watch("src/scss/*", gulp.series(css, copy));
  gulp.watch("src/js/*", gulp.series(scripts, copy));
  // gulp.watch("src/images/*", copyImages);
  gulp.watch("src/images/**/*", gulp.series(images, copy));

  // 檔案新增時監聽
  gulp.watch(["src/**/*.html"]).on('add', file => {
    file = slash(file)
    if (!(String(file)).includes('src/templates')) {
      // 針對單一檔案更新
      const run = gulp.series(layout(file))
      run()
    } else {
      // 如果改的檔案在src/templates那會異動全部
      const run = gulp.series(layout())
      run()
    }
  });

  // 檔案更改時監聽
  gulp.watch(["src/**/*.html", "!src/templates"]).on('change', file => {
    file = slash(file)
    if (!(String(file)).includes('src/templates')) {
      // 針對單一檔案更新
      const run = gulp.series(layout(file))
      run()
    } else {
      // 如果改的檔案在src/templates那會異動全部
      const run = gulp.series(layout())
      run()
    }
  });
}

function watchFiles_copy() {
  gulp.watch("src/scss/*", gulp.series(css, copyCss));
  gulp.watch("src/js/*", gulp.series(scripts, copyjs));
  gulp.watch("src/images/*", gulp.series(images, copyImages));
}

// 任務清單
const js = gulp.series(scripts);
const build = gulp.parallel(basisCopy, css, images, js, layout());
const dev = gulp.series(clean, build, browserSync, copy, watchFiles)
const watch = gulp.series(clean, gulp.parallel(basisCopy, css, images, js), copy, watchFiles_copy);
// 一般開發輸出
//gulp.series(照順序執行)
//gulp.parallel(同時執行)

//一般切版用  =>  gulp dev
//進mvc專案用  => gulp watch



// export tasks
exports.images = images;
exports.css = css;
exports.js = js;
exports.clean = clean;
exports.build = build;
exports.default = build;
exports.watch = watch;
exports.layout = layout();
exports.copy = copy;
exports.dev = dev;
exports.plumber = plumber;
exports.basisCopy = basisCopy;
