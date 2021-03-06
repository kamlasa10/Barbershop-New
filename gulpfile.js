
'use strict';

const gulp = require('gulp');

var buffer = require('vinyl-buffer');
var csso = require('gulp-csso');
var imagemin = require('gulp-imagemin');
var merge = require('merge-stream');

var spritesmith = require('gulp.spritesmith');

const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const groupMediaQueries = require('gulp-group-css-media-queries');
const cleanCSS = require('gulp-cleancss');

const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');

const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');

const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const replace = require('gulp-replace');
const del = require('del');
const plumber = require('gulp-plumber');
const browserSync = require('browser-sync').create();

const paths =  {
  src: './src/',              // paths.src
  build: './build/'           // paths.build
};

var config = {
  mode: {
    symbol: {
      sprite: "../sprite.svg",
      render: {
      }
    }
  }
};

function SpritePng() {
  const spriteData =  gulp.src(paths.src + '/images/*.png').pipe(spritesmith({
    imgName: 'sprite.png',
    cssName: 'sprite.css'
  }));

  const imgStream = spriteData.img
      .pipe(buffer())
      .pipe(imagemin())
      .pipe(gulp.dest(paths.build + 'images'));

  const cssStream = spriteData.css
      .pipe(csso())
      .pipe(gulp.dest(paths.build + 'css/'));

  return merge(imgStream, cssStream);
};

function SpriteSvg() {
  return gulp.src(paths.src + '/icons/*.svg')
  // минифицируем svg
      .pipe(svgmin({
        js2svg: {
          pretty: true
        }
      }))
      // удалить все атрибуты fill, style and stroke в фигурах
      .pipe(cheerio({
        run: function($) {
          $('[fill]').removeAttr('fill');
          $('[stroke]').removeAttr('stroke');
          $('[style]').removeAttr('style');
        },
        parserOptions: {
          xmlMode: true
        }
      }))
      // cheerio плагин заменит, если появилась, скобка '&gt;', на нормальную.
      .pipe(replace('&gt;', '>'))
      // build svg sprite
      .pipe(svgSprite(config))
      .pipe(gulp.dest(paths.build + '/icons/sprite/'));
};


function styles() {
  return gulp.src(paths.src + 'scss/main.scss')
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sassGlob())
      .pipe(sass()) // { outputStyle: 'compressed' }
      .pipe(groupMediaQueries())
      .pipe(cleanCSS())
      .pipe(rename({ suffix: ".min" }))
      .pipe(sourcemaps.write('/'))
      .pipe(gulp.dest(paths.build + 'css'))
}

function scripts() {
  return gulp.src(paths.src + 'js/*.js')
      .pipe(plumber())
      .pipe(babel({
        presets: ['env']
      }))
      .pipe(uglify())
      .pipe(concat('main.min.js'))
      .pipe(gulp.dest(paths.build + 'js/'))
}

function htmls() {
  return gulp.src(paths.src + '*.html')
      .pipe(plumber())
      .pipe(replace(/\n\s*<!--DEV[\s\S]+?-->/gm, ''))
      .pipe(gulp.dest(paths.build));
}
function img() {
  return gulp.src(paths.src + 'images/*')
      .pipe(gulp.dest(paths.build + 'images'));
}
function fonts() {
  return gulp.src(paths.src + 'fonts/**/*')
      .pipe(gulp.dest(paths.build + 'fonts'));
}
function clean() {
  return del('build/')
}

function watch() {
  gulp.watch(paths.src + 'scss/**/*.scss', styles);
  gulp.watch(paths.src + 'js/*.js', scripts);
  gulp.watch(paths.src + '*.html', htmls);
}

function serve() {
  browserSync.init({
    server: {
      baseDir: paths.build
    }
  });
  browserSync.watch(paths.build + '**/*.*', browserSync.reload);
}

exports.styles = styles;
exports.scripts = scripts;
exports.htmls = htmls;
exports.clean = clean;
exports.watch = watch;
exports.img = img;
exports.fonts = fonts;
exports.SpriteSvg = SpriteSvg;
exports.SpritePng = SpritePng;

gulp.task('build', gulp.series(
    clean,
    styles,
    scripts,
    htmls,
    img,
    fonts,
    SpriteSvg,
    SpritePng
    // gulp.parallel(styles, scripts, htmls, img, fonts)
));

gulp.task('default', gulp.series(
    clean,
    gulp.parallel(styles, scripts, htmls, img, fonts, SpriteSvg, SpritePng),
    gulp.parallel(watch, serve)
));