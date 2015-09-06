var React = require('react/addons')
var injectTapEventPlugin = require('react-tap-event-plugin')
var Main = require('./main.jsx')

injectTapEventPlugin()
window.React = React

React.render(<Main />, document.body)
