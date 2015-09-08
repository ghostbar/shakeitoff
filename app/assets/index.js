var domready = require('domready')
var dom = require('dom-events')
var spoof = require('spoof')
var sudo = require('sudo-fn')

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

function setMACAddress (device, address, port) {
  sudo.setName('shakeitoff')
  sudo.call({
    'module': 'spoof',
    'function': 'setInterfaceMAC',
    'params': [device, address, port]
  }, function (err) {
    console.log(err)
    getInterfacesList()
  })
}

function randomizeMAC (device) {
  var it = spoof.findInterface(device)
  var randomMAC = spoof.random()
  setMACAddress(device, randomMAC, it.port)
}

function resetMAC (device) {
  var it = spoof.findInterface(device)
  setMACAddress(device, it.address, it.port)
}

function createDOMForInterfaces (interfaces) {
  var html = '<ul>'
  interfaces.forEach(function (item) {
    html = html + '<li id="' + item.device + '"><div class="content">' +
      '<span class="dark">' + item.device +
      ' / ' + item.port + '</span><br/>' +
      '<span class="dark">Original MAC</span> ' + item.address + '<br/>' +
      '<span class="dark">Current MAC</span> ' + item.currentAddress + '<br/>' +
      '</div><!-- .content -->' +
      '<a href="#" class="reset" id="reset-' + item.device +
      '" title="Reset MAC"><i class="material-icons">settings_backup_restore</i></a> ' +
      '<a href="#" class="randomize" id="randomize-' + item.device +
      '" title="Randomize MAC"><i class="material-icons">repeat</i></a></li>'
  })
  html = html + '</ul>'
  document.getElementById('interfaces-list').innerHTML = html
}

function listenOnInterfacesListElements (interfaces) {
  interfaces.forEach(function (item) {
    var resetButton = document.getElementById('reset-' + item.device)
    var randomizeButton = document.getElementById('randomize-' + item.device)

    dom.on(resetButton, 'click', function () {
      resetMAC(item.device)
    })

    dom.on(randomizeButton, 'click', function () {
      randomizeMAC(item.device)
    })
  })
}

function getInterfacesList () {
  var interfaces = loadInterfaces()
  createDOMForInterfaces(interfaces)
  listenOnInterfacesListElements(interfaces)
}

domready(function () {
  var refreshButton = document.getElementById('refresh-button')
  getInterfacesList()

  dom.on(refreshButton, 'click', function () {
    getInterfacesList()
  })
})
