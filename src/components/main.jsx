var React = require('react')
var mui = require('material-ui')
var AppBar = mui.AppBar
var Colors = mui.Styles.Colors
var IconButton = mui.IconButton
var FontIcon = mui.FontIcon
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
      var blacklist = item.port === 'Bluetooth PAN' ||
        item.port === 'Thunderbolt 1' ||
        item.port === 'Thunderbolt 2'
      return item.address != null && !blacklist
    })
  },
  getInitialState: function () {
    return { interfaces: this.getInterfaces() }
  },
  _handleLoadInterfaces: function () {
    this.setState({ interfaces: this.getInterfaces() })
  },
  randomizeMAC: function (device) {
    var self = this
    sudo.exec('spoof randomize ' + device, function (err) {
      console.log(err)
      self._handleLoadInterfaces()
    })
  },
  resetMAC: function (device) {
    var self = this
    sudo.exec('spoof reset ' + device, function (err) {
      console.log(err)
      self._handleLoadInterfaces()
    })
  },
  render: function () {
    var self = this
    var interfaces = this.state.interfaces.map(function (item) {
      var refresh = <IconButton tooltip='Reset'
        onClick={self.resetMAC.bind(this, item.device)}>
        <i className='material-icons'>settings_backup_restore</i>
      </IconButton>

      return (
        <div key={item.device}>
          <ListItem
            onClick={self.randomizeMAC.bind(this, item.device)}
            rightIconButton={refresh}
            primaryText={item.device + ' / ' + item.port}
            secondaryText={
              <p>
                <span style={{color: Colors.darkBlack}}>{item.address}</span> {item.currentAddress}<br/>
              </p>
            }
            right/>
          <ListDivider />
        </div>
      )
    })
    console.log(this.state.interfaces)
		return (
      <div>
        <AppBar
          title='Click to Randomize MAC'
          iconElementLeft={<IconButton tooltip='Refresh Interfaces'
            onClick={this._handleLoadInterfaces}>
            <i className='material-icons'>refresh</i>
          </IconButton>} />
        <List subheader="List of Devices">
          {interfaces}
        </List>
			</div>
		)
  }
})

module.exports = Main
