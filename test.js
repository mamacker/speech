var gpio = require("rpi-gpio");
gpio.setup(21, gpio.DIR_OUT, write);

function write() {
  gpio.write(21, true, function(err) {
      if (err) throw err;
      console.log('Written to pin');
      });
}
