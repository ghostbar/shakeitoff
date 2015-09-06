var React = require('react')
var mui = require('material-ui')
var AppBar = mui.AppBar
var Colors = mui.Styles.Colors
var IconButton = mui.IconButton
var List = mui.List
var ListItem = mui.ListItem
var ListDivider = mui.ListDivider
var ThemeManager = new mui.Styles.ThemeManager()
var spoof = window.require('spoof')
var sudo = window.require('sudo-prompt')
sudo.setName('shakeitoff')

var Main = React.createClass({
  childContextTypes: { muiTheme: React.PropTypes.object },
  getChildContext: function () {
    return { muiTheme: ThemeManager.getCurrentTheme() }
  },
  displayName: 'Main',
  getInterfaces: function () {
    return spoof.findInterfaces().filter(function (item) {
      return item.address != null
    })
  },
  getInitialState: function () {
    return { interfaces: this.getInterfaces() }
  },
  _handleLoadInterfaces: function () {
    this.setState({ interfaces: this.getInterfaces() })
  },
  randomizeMAC: function (device) {
    console.log('CALLING ALL THE PEOPLE! SUDO!')
    sudo.exec('echo \'' + device + '\'', function (err) {
      console.log(err)
    })
  },
  render: function () {
    var self = this
    var interfaces = this.state.interfaces.map(function (item) {
      return (
        <div key={item.device}>
          <ListItem
            onClick={self.randomizeMAC.bind(this, item.device)}
            primaryText={item.device + ' / ' + item.port}
            secondaryText={
              <p>
                <span style={{color: Colors.darkBlack}}>MAC Address</span> {item.address}<br/>
                <span style={{color: Colors.darkBlack}}>Current MAC</span> {item.currentAddress}<br/>
              </p>
            } />
          <ListDivider />
        </div>
      )
    })
    console.log(this.state.interfaces)
		return (
      <div>
        <AppBar
          title='Select Interface'
          iconElementLeft={<IconButton iconClassName='material-refresh' />} />
        <List subheader="List of Devices">
          {interfaces}
        </List>
			</div>
		)
  }
})

module.exports = Main
