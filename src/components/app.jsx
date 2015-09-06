(function () {
  var React = require('react')
  var injectTapEventPlugin = require('react-tap-event-plugin')
  var Main = require('./main/Main.jsx')
  var spoof = require('spoof')
  var remote = window.require('remote')

  injectTapEventPlugin()
	window.React = React

	React.render(
    <Main />, document.body
  )
})()
