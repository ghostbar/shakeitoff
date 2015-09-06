var React = require('react')
var mui = require('material-ui')
var spoof = require('spoof')
var RaisedButton = mui.RaisedButton
var ThemeManager = new mui.Styles.ThemeManager()

var Main = React.createClass({
  displayName: 'Main',
  childContextTypes: {
    muiTheme: React.PropTypes.object
  },
  getChildContext: function () {
    return { muiTheme: ThemeManager.getCurrentTheme() }
  },
  getInitialState: function () {
    return {
      txt: 'Uninitialized'
    }
  },
	render: function () {
		return (
			<div>
        <p>Hello World!</p>
        <RaisedButton label='Default' onTouchTap={this._handleTouchTap} />
        {this.state.txt}
			</div>
		)
  },
  _handleTouchTap: function () {
    var w = spoof.findInterfaces()
    this.setState({ txt: 'Initialized' })
  }
})

module.exports = Main
