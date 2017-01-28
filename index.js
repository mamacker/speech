var speech = require('@google-cloud/speech')();
var fs = require('fs');
var gpio = require("rpi-gpio");
var http = require('http');
gpio.setMode(gpio.MODE_BCM);

const Hs100Api = require('./hs100-api'); 
 
const client = new Hs100Api.Client(); 
const tvlightplug = client.getPlug({host: '192.168.1.2'}); 
const couchlightplug = client.getPlug({host: '192.168.1.3'}); 
const mattlightplug = client.getPlug({host: '192.168.1.4'}); 

const spawn = require('child_process').spawn;

// Note that we exposed the credentials via an export call.
// export GOOGLE_APPLICATION_CREDENTIALS
// export GOOGLE_APPLICATION_CREDENTIALS=/home/pi/speech/gcloud/keyfile.json

process.env.GOOGLE_APPLICATION_CREDENTIALS='/home/pi/speech/gcloud/keyfile.json';

speech = require('@google-cloud/speech')({
  projectId: 'mattandroxanne.com:kids-comm',
  keyFilename: '/home/pi/speech/gcloud/keyfile.json'
});

var request = {
  config: {
    encoding: 'LINEAR16',
    sampleRate: 16000
  },
  singleUtterance: false,
  interimResults: true 
};

var busy = false;
function utterToMe() {
  if (busy == true) {
    return;
  }

  busy = true;
  const arecord = spawn('arecord', ['-f','S16_LE','-r','16000', '-D','plughw:CARD=Device,DEV=0'], {}, () => { console.log("Started"); });

  console.log("Kicked off process.");
  var recognized = false;
  arecord.stdout.pipe(speech.createRecognizeStream(request))
      .on('error', console.error)
      .on('data', function(data) {
        if (data.results) {
          console.log(data.results);
          if ((data.results + "").match(/(blue nose|the most|Luna's|Lulu|Luna|limos|Loom|lumos|loomis|blue moon)/)) {
            recognized = true;
            tvlightplug.setPowerState(true); 

            if ((data.results + "").toLowerCase().match(/omni/)) {
              couchlightplug.setPowerState(true); 
              mattlightplug.setPowerState(true); 
            }
          }

          if ((data.results + "").match(/(docs?|knox|nox|nocks|knock|nock)/)) {
            recognized = true;
            tvlightplug.setPowerState(false); 
            if ((data.results + "").toLowerCase().match(/omni/)) {
              couchlightplug.setPowerState(false); 
              mattlightplug.setPowerState(false); 
            }
          }

          if ((data.results + "").toLowerCase().match(/expelliarmus/)) {
            recognized = true;
            http.get('http://192.168.1.33:8080/resetnetwork', (res) => {
            });
          }

          if (recognized) {
            recognized = false;
            arecord.kill();
            busy = false;
          }
        }
      });

  setTimeout(() => {
    console.log("Done with current recognition.");
    arecord.kill();
    busy = false;
  }, 5000);
}

var switchPin = 21;
gpio.setup(switchPin, gpio.DIR_IN, gpio.EDGE_RISING, () => {
  gpio.on('change', function(channel, value) {
    console.log("Pin " + channel + " is " + value);
    utterToMe();
  });
});

