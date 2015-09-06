var React = require('react')
var mui = require('material-ui')
var AppBar = mui.AppBar
var IconButton = mui.IconButton
var List = mui.List
var ListItem = mui.ListItem
var ListDivider = mui.ListDivider
var ThemeManager = new mui.Styles.ThemeManager()
var spoof = window.require('spoof')

var Main = React.createClass({
  childContextTypes: { muiTheme: React.PropTypes.object },
  getChildContext: function () {
    return { muiTheme: ThemeManager.getCurrentTheme() }
  },
  displayName: 'Main',
  getInitialState: function () {
    return { interfaces: spoof.findInterfaces() }
  },
  _handleLoadInterfaces: function () {
    this.setState({ interfaces: spoof.findInterfaces() })
  },
  render: function () {
    var interfaces = this.state.interfaces.map(function (item) {
      return (
        <div>
          <ListItem primaryText={item.device} />
          <ListDivider inset={true} />
        </div>
      )
    })
    console.log(this.state.interfaces)
		return (
      <div>
        <AppBar
          title='Select Interface'
          iconElementLeft={<IconButton iconClassName='material-refresh' />} />
        <List>{interfaces}</List>
			</div>
		)
  }
})

module.exports = Main
