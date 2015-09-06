exports.getit = function getit () {
  var spoof = require('spoof')
  return spoof.findInterfaces()
}
