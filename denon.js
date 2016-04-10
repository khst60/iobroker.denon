"use strict";

var utils 	= require(__dirname + '/lib/utils');
var net 	= require('net');  
var S		= require('string');  				                             
var adapter = utils.adapter('denon');

var socketAVR = "";

var statusReq = ["PW?", "MV?", "MU?", "SI?", "CV?", "MS?", "Z2?", "Z2MU?"];

adapter.on('message', function (obj) {
    adapter.log.debug("adapter.on-message: << MESSAGE >>");
});

adapter.on('ready', function () {
    adapter.log.debug("adapter.on-ready: << READY >>");
    main();
});

adapter.on('unload', function () {
    adapter.log.debug "adapter.on-unload: << UNLOAD >>");
});

adapter.on('stateChange', function (id, state) {
	if (!id || !state || state.ack) {
        return;
    }
	
    adapter.log.debug("adapter.on-stateChange: << stateChange >>");
	adapter.log.info ("adapter.on-stateChange: " + id + " " + JSON.stringify(state));
	var ids = id.split(".");
    ids = ids[ids.length - 1];

	var denonCmd = "";
	/**
	switch (ids) {
		case 'power':
			denonCmd = 'PW' + state.val;
			break;
		case 'power2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'input':
			denonCmd = 'SI' + state.val;
			break;
		case 'input2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'volume':
			denonCmd = 'MV' + state.val;
			break;
		case 'volume2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'mute':
			denonCmd = 'MU' + state.val;
			break;
		case 'mute2':
			denonCmd = 'Z2MU' + state.val;
			break;		
	}
	if (denonCmd.length > 0) {
		adapter.log.debug("adapter.on-stateChange: " + denonCmd);		
//		socketAVR.write(denonCmd + '\r');
	}
	*/
	
});


function connectToDenon(host) {
    socketAVR = net.connect({port: 23, host: host}, function() {
		adapter.log.debug("adapter connected to DENON-AVR: " + host + ":" + "23");
    });
	
    var connecting = false;

    function restartConnection() {
        adapter.log.warn("function restart connection called");
        if (socketAVR) {
            socketAVR.end();
            socketAVR = null;
        }
        if (!connecting) {				// try to reconnect every 10 seconds
            adapter.log.warn("restart connection to Denon-AVR");
            connecting = setTimeout(function() {
                connectToDenon(host);
            }, 10000);
        }
    }	

	socketAVR.on('error', restartConnection);
	socketAVR.on('close', restartConnection);
	socketAVR.on('end',   restartConnection);
	
	socketAVR.on('data', function(data) {
		var dataStr = data.toString();
		adapter.log.info("data from " + adapter.config.host + ": *" + dataStr + "*");
		
		var response = dataStr.split("\r");
//		adapter.log.debug("response: " + response + " " + response.length);
/**
		for (var i = 0; i < response.length-1; i++) {
			var cmd = response[i].substr(0, 2);
			var par = response[i].slice(2);
			adapter.log.debug ("debug: *" + cmd + par + "*");
			switch (cmd) {
				case "CV":
				case "PV":
				case "PS":
					break;
				case "MS":
					adapter.setState ('denonSound', {val: par, ack: true});
					break;
				case "PW":
					adapter.setState ('denonPower', {val: par, ack: true});
					break;
				case "SI":
					adapter.setState ('denonInput', {val: par, ack: true});
					break;
				case "MU":
					adapter.setState ('denonMute', {val: par,  ack: true}); 
					break;
				case "MV":
					if (!isNaN(par)) {
						adapter.setState ('denonVolume', {val: par,  ack: true}); 
					}
					break;
				case "Z2":
					switch (par.substr(0, 2)) {
						case "ON":
						case "OF":
							adapter.setState ('denonPower2', {val: par, ack: true});
							break;
						case "MU":
							adapter.setState ('denonMute2', {val: par.slice(2), ack: true});
							break;
						case "UP":
						case "DO":
							break;
						default:
							if (!isNaN(par)) {		// Volume zone 2
								adapter.setState ('denonVolume2', {val: par,  ack: true}); 
							}
							break;
					}
					break;
			}
		}
		*/
	});
}

function main() {
    adapter.log.debug("adapter.main: << MAIN >>");
	
	var host = adapter.config.host;
	
    connectToDenon(host);
	
	adapter.subscribeStates('power');
	adapter.subscribeStates('power2');
	adapter.subscribeStates('mute');
	adapter.subscribeStates('mute2');
	
	adapter.subscribeStates('denonPower');
	adapter.subscribeStates('denonPower2');
	adapter.subscribeStates('denonVolume');
	adapter.subscribeStates('denonVolume2');
	adapter.subscribeStates('denonMute');
	adapter.subscribeStates('denonMute2');
	adapter.subscribeStates('denonInput');
	adapter.subscribeStates('denonInput2');
	adapter.subscribeStates('denonSound');
	adapter.subscribeStates('denonSound2');

	for (var i = 0; i < statusReq.length; i++) {
	    adapter.log.debug("adapter.main: request status: " + statusReq[i]);
		socketAVR.write(statusReq[i] + '\r');
	}
}
