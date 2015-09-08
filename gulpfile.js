var gulp = require('gulp')
var less = require('gulp-less')

function watchAndRecompile () {
	gulp.watch('./src/style/**/*', [ 'less' ])
}

gulp.task('watch-all', function () {
	watchAndRecompile()
})

gulp.task('watch-compile', [ 'compile' ], watchAndRecompile)
gulp.task('default', [ 'watch-compile' ])

gulp.task('less', function () {
	return gulp.src('./src/style/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('./app/assets'))
})

gulp.task('compile', [
  'less'
])
