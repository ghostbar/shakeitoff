var domready = require('domready')
var dom = require('dom-events')
var spoof = window.require('spoof')

/**
 * calls `spoof` to get the interfaces and filters out the ones it can't change
 *
 * @returns {Object[]} array of devices
 */
function loadInterfaces () {
  return spoof.findInterfaces().filter(function (item) {
    var blacklist = item.port === 'Bluetooth PAN' ||
      item.port === 'Thunderbolt 1' ||
      item.port === 'Thunderbolt 2'

    return item.address && !blacklist
  })
}

function createDOMForInterfaces (interfaces) {
  var html = '<ul>'
  interfaces.forEach(function (item) {
    html = html + '<li><span>' + item.device + ' / ' + item.port + '</span><br/>' +
      item.address + ' / ' + item.currentAddress + '</li>'
  })
  html = html + '</ul>'
  document.getElementById('interfaces-list').innerHTML = html
}

function getInterfacesList () {
  createDOMForInterfaces(loadInterfaces())
}

domready(function () {
  var refreshButton = document.getElementById('refresh-button')
  getInterfacesList()

  dom.on(refreshButton, 'click', function (e) {
    getInterfacesList()
  })
})
