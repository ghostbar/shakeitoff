var domready = require('domready')
var dom = require('dom-events')
var spoof = require('spoof')
var sudo = require('sudo-fn')
var Mustache = require('mustache')
var async = require('async')
var fs = require('fs')

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
 *
 * @param opts {Object}
 * @param opts.template {String} template name
 * @param opts.where {String} id where to render the template
 * @param opts.data {Object} data to be passed to the template
 */
function renderTemplate (opts, cb) {
  opts.data = opts.data || {}
  fs.readFile(__dirname + '/assets/tmpl/' + opts.template + '.tmpl', function (err, template) {
    if (err)
      return cb(err)

    var html = Mustache.render(template.toString(), opts.data)
    document.getElementById(opts.where).innerHTML = html
    return cb(null)
  })
}

/**
 * creates the DOM for the interfaces list
 *
 * @param {Object[]} interfaces the array of interfaces available
 */
function createDOMForInterfaces (interfaces) {
  renderTemplate({
    template: 'interfaces-list',
    where: 'interfaces-list',
    data: { interfaces: interfaces }
  }, function (err) {
    if (err)
      throw err

    listenOnInterfacesListElements(interfaces)
  })
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
    var setSpecificMacButton = document.getElementById('set-specific-' + item.device)

    dom.on(resetButton, 'click', function () {
      resetMAC(item.device)
    })

    dom.on(randomizeButton, 'click', function () {
      randomizeMAC(item.device)
    })

    dom.on(setSpecificMacButton, 'click', function () {
      renderTemplate({
        template: 'set-specific-mac-dialog',
        where: 'set-specific-mac-dialog-container',
        data: {}
      }, function (err) {
        if (err) throw err
        toggleVisibilitySetSpecificMacDialog()
      })
    })
  })
}

function toggleVisibilitySetSpecificMacDialog () {
  var el = document.getElementById('set-specific-mac-dialog')
  el.style.visibility = (el.style.visibility === 'visible') ? 'hidden' : 'visible'
}

/**
 * gets the interfaces list and sends it to create a dom for it and listen to
 * events on those newly created DOM objects
 */
function getInterfacesList () {
  var interfaces = loadInterfaces()
  createDOMForInterfaces(interfaces)
}

function injectBasicTemplates (tmpls) {
  tmpls = tmpls || []
  async.each(tmpls, function iterator (item, cb) {
    fs.readFile(__dirname + '/assets/tmpl/' + item + '.tmpl', function injectTemplate (err, template) {
      if (err)
        return cb(err)

      var html = Mustache.render(template.toString())
      document.getElementById(item + '-container').innerHTML = html
    })
  }, function done (err) {
    if (err)
      throw err
  })
}

domready(function () {
  var refreshButton = document.getElementById('refresh-button')
  getInterfacesList()

  injectBasicTemplates()

  dom.on(refreshButton, 'click', function () {
    getInterfacesList()
  })
})
