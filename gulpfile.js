var gulp = require('gulp')
var atom = require('gulp-atom')
var browserify = require('browserify')
var install = require('gulp-install')
var less = require('gulp-less')
var reactify = require('reactify')
var source = require('vinyl-source-stream')

function watchAndRebuild () {
	gulp.watch([ './compile/**/*' ], [ 'build' ])
}

function watchAndRecompile () {
	gulp.watch('./src/components/**/*', [ 'browserify' ])
	gulp.watch([ './src/index.html', './src/index.js' ], [ 'through' ])
	gulp.watch('./src/style/**/*', [ 'less' ])
}

gulp.task('watch-all', function () {
	watchAndRecompile()
	watchAndRebuild()
})
gulp.task('watch-compile', [ 'compile' ], watchAndRecompile)
gulp.task('watch-build', [ 'build' ], watchAndRebuild)
gulp.task('default', [ 'watch-compile' ])

gulp.task('build', function () {
	atom({
		srcPath: './compile',
		releasePath: './build',
		cachePath: './cache',
		version: 'v0.30.2',
		rebuild: false,
		platforms: [ 'darwin-x64' ]
	})
})

gulp.task('through', function () {
	return gulp.src([ './src/index.html', './src/index.js' ])
		.pipe(gulp.dest('./compile'))
})

gulp.task('less', function () {
	return gulp.src('./style/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('./compile/style'))
})

gulp.task('browserify', function () {
	var bundler = browserify({
		entries: [ './src/components/app.jsx' ],
		transform: [ reactify ]
	})
	return bundler.bundle()
		.pipe(source('app.jsx'))
		.pipe(gulp.dest('./compile'))
})

gulp.task('compile', [
  'browserify',
  'through',
  'less',
  'install'
])

gulp.task('install', function () {
	return gulp.src('./package.json')
		.pipe(gulp.dest('./compile'))
		.pipe(install({ production: true }))
})
