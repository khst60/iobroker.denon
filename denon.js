"use strict";

var utils 	= require(__dirname + '/lib/utils');
var net 	= require('net');  
var S		= require('string');  				                             
var adapter = utils.adapter('denon');

var socketAVR = "";

var statusReq = ["PW?", "MV?", "MU?", "SI?", "CV?", "MS?", "Z2?", "Z2MU?", "MNZST?", "HD?"];



adapter.on('message', function (obj) {
    adapter.log.debug("adapter.on-message: << MESSAGE >>");
});

adapter.on('ready', function () {
    adapter.log.debug("adapter.on-ready: << READY >>");
    main();
});

adapter.on('unload', function () {
    adapter.log.debug("adapter.on-unload: << UNLOAD >>");
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

	switch (ids) {
		case 'textCmd':
			denonCmd = state.val;
			break;
		case 'denonAllZoneStereo':
			denonCmd = 'MN' + state.val;
			break;
		case 'denonPower':
			denonCmd = 'PW' + state.val;
			break;		
		case 'power':		// bool cmd
			if (state.val) { denonCmd = 'PWON'; }
			else		   { denonCmd = 'PWSTANDBY'; }
			break;
		case 'denonPower2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'power2':		// bool cmd
			if (state.val) { denonCmd = 'Z2ON'; }
			else		   { denonCmd = 'Z2OFF'; }
			break;
		case 'denonInput':
			denonCmd = 'SI' + state.val;
			break;
		case 'denonInput2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'denonVolume':
			denonCmd = 'MV' + state.val;
			break;
		case 'denonVolume2':
			denonCmd = 'Z2' + state.val;
			break;
		case 'denonMute':
			denonCmd = 'MU' + state.val;
			break;
		case 'mute':		// bool cmd
			if (state.val) { denonCmd = 'MUON'; }
			else		   { denonCmd = 'MUOFF'; }
			break;	
		case 'denonMute2':
			denonCmd = 'Z2MU' + state.val;
			break;
		case 'mute2':		// bool cmd
			if (state.val) { denonCmd = 'Z2MUON'; }
			else		   { denonCmd = 'Z2MUOFF'; }
			break;			
	}
	if (denonCmd.length > 0) {
		adapter.log.debug("adapter.on-stateChange: " + denonCmd);		
		socketAVR.write(denonCmd + '\r');
	}
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
				case "MN":
					adapter.setState ('denonAllZoneStereo', {val: par, ack: true});
					break;
				case "PW":
					adapter.setState ('denonPower', {val: par, ack: true});
					if (par === "ON") { adapter.setState ('power', {val: true,  ack: true}); }
					else 			  { adapter.setState ('power', {val: false, ack: true}); }
					break;
				case "SI":
					adapter.setState ('denonInput', {val: par, ack: true});
					break;
				case "MU":
					adapter.setState ('denonMute', {val: par,  ack: true});
					if (par === "ON") { adapter.setState ('mute', {val: true,  ack: true}); }
					else 			  { adapter.setState ('mute', {val: false, ack: true}); }
					break;
				case "MV":
					if (!isNaN(par)) {
						adapter.setState ('denonVolume', {val: par.substr(0,2), ack: true}); 
					}
					break;
				case "Z2":
					switch (par.substr(0, 2)) {
						case "ON":
						case "OF":
							adapter.setState ('denonPower2', {val: par, ack: true});
							if (par.substr(0, 2) === "ON") { adapter.setState ('power2', {val: true,  ack: true}); }
							else 			          	   { adapter.setState ('power2', {val: false, ack: true}); }
							break;
						case "MU":
							adapter.setState ('denonMute2', {val: par.slice(2), ack: true});
							if (par.slice(2) === "ON") { adapter.setState ('mute2', {val: true,  ack: true}); }
							else 			  		   { adapter.setState ('mute2', {val: false, ack: true}); }
							break;
						case "UP":
						case "DO":
							break;
						default:
							if (!isNaN(par)) {		// Volume zone 2
								adapter.setState ('denonVolume2', {val: par, ack: true}); 
							}
							break;
					}
					break;
			}
		}
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
	adapter.subscribeStates('textCmd');
	
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
	adapter.subscribeStates('denonAllZoneStereo');

	// initialize various states
	for (var i = 0; i < statusReq.length; i++) {
	    adapter.log.debug("adapter.main: request status: " + statusReq[i]);
		socketAVR.write(statusReq[i] + '\r');
	}
}
