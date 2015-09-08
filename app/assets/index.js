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

/**
 * set a MAC address using `sudo-fn` to get administrator permissions
 *
 * @param {String} device
 * @param {String} address
 * @param {String} port
 */
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

/**
 * randomizes a MAC address
 *
 * @param {String} device
 */
function randomizeMAC (device) {
  var it = spoof.findInterface(device)
  var randomMAC = spoof.random()
  setMACAddress(device, randomMAC, it.port)
}

/**
 * resets a MAC address to it's original value
 *
 * @param {String} device
 */
function resetMAC (device) {
  var it = spoof.findInterface(device)
  setMACAddress(device, it.address, it.port)
}

/**
 * creates the DOM for the interfaces list
 *
 * @param {Object[]} interfaces the array of interfaces available
 */
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

/**
 * listens on events from the listed interfaces
 *
 * @param {Object[]} interfaces the array of interfaces available
 */
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

/**
 * gets the interfaces list and sends it to create a dom for it and listen to
 * events on those newly created DOM objects
 */
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
