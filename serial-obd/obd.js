var { SerialPort } = require('serialport')

var { EventEmitter } = require("node:events")

var OBDdata = require("./obdInfo");
const { resolve } = require('node:path');

var queue = [];

var connected = false;

var intervalWriter;

class OBDEmitter extends EventEmitter {};

const OBD = new OBDEmitter();

function getPIDByName(name) {
    for(var i = 0; i < OBDdata.length; i++){
        if(OBDdata[i].name === name){
            if(OBDdata[i].pid !== undefined){
                return (OBDdata[i].mode + OBDdata[i].pid);
            }
            //There are modes which don't require a extra parameter ID.
            return (OBDdata[i].mode);
        }
    }
}

function parseOBDCommand(hexString) {
    var reply,
        byteNumber,
        valueArray; //New object

    reply = {};
    if (hexString === "NO DATA" || hexString === "OK" || hexString === "?") { //No data or OK is the response.
        reply.value = hexString;
        // console.log(reply)
        return reply;
    }

    hexString = hexString.replace(/ /g, ''); //Whitespace trimming //Probably not needed anymore?
    valueArray = [];

    for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
        valueArray.push(hexString.substr(byteNumber, 2));
    }

    if (valueArray[0] === "41") {
        reply.mode = valueArray[0];
        reply.pid = valueArray[1];
        for (var i = 0; i < OBDdata.length; i++) {
            if(OBDdata[i].pid == reply.pid) {
                var numberOfBytes = OBDdata[i].bytes;
                reply.name = OBDdata[i].name;
				reply.description = OBDdata[i].description;
				reply.min = OBDdata[i].min;
				reply.max = OBDdata[i].max;
				reply.unit = OBDdata[i].unit;
                switch (numberOfBytes)
                {
                    case 1:
                        reply.value = OBDdata[i].convertToUseful(valueArray[2]);
                        break;
                    case 2:
                        reply.value = OBDdata[i].convertToUseful(valueArray[2], valueArray[3]);
                        break;
                    case 4:
                        reply.value = OBDdata[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5]);
                        break;
                    case 8:
                        reply.value = OBDdata[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7], valueArray[8], valueArray[9]);
                        break;
                }
                break; //Value is converted, break out the for loop.
            }
        }
    } else if (valueArray[0] === "43") {
        reply.mode = valueArray[0];
        for (var i = 0; i < OBDdata.length; i++) {
            if(OBDdata[i].mode == "03") {
                reply.name = OBDdata[i].name;
				reply.description = OBDdata[i].description;
				reply.min = OBDdata[i].min;
				reply.max = OBDdata[i].max;
				reply.unit = OBDdata[i].unit;
                reply.value = OBDdata[i].convertToUseful(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6]);
            }
        }
    }
    return reply;
}

OBD.connect = async function (portName) {
    var port = new SerialPort({ path: portName, baudRate: 38400, dataBits: 8, stopBits: 1, parity: "none" })

    port.on("close", function(err) {
        if(this.debug) console.log('Serial port ['+ portName +'] was closed');
    })

    port.on("open", function () {
        console.log("Serial port [" + portName + "] open")

        connected = true;

        var waitVal = 100

        write("ATZ")
        write("ATSP0")
        write("ATE0")
        write("ATL0")
        write("ATST19")
        write("ATRV")
        write("AT@2")
        write("AT@1")
        write("0100")
        write("0120")
        write("011C")
        write("0113")
        write("0600")
        write("0900")
        write("08000000000000")
        write("ATDP")
        write("ATDPN")
        write("A2")
        write("0101")
        write("020000")
        write("050001")
        write("ATH1")
        write("0100")
        // write("ATH0")
        write("ATBRT0F")
        write("ATBRD45")

        var writeDelay = 100

        // Setup write queue
        intervalWriter = setInterval(function(){
            if(queue.length > 0 && connected){

                try {
                    var command = queue.shift();
                    port.write(command);
                }
                catch(err) {
                    console.log('Error while writing: ' + err);
                    clearInterval(intervalWriter);
                    // self.removeAllMonitors();
                }
            }
        }, writeDelay);

        OBD.emit("connection")

        // port.write("ATH1")
        // port.write("010D")
    })

    // write(getPIDByName("vss"), 1)
    // write(getPIDByName("rpm"), 1)
    
    
    // const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }))
    // parser.on('data', console.log)
    
    port.on('data', function(data) {
        // console.log(data)
        var currentString = data.toString('utf8'), // making sure it's a utf8 string
            arrayOfCommands = currentString.split('>'),
            forString;

        for(var commandNumber = 0; commandNumber < arrayOfCommands.length; commandNumber++) {
            forString = arrayOfCommands[commandNumber];
            if(forString === '') {
                continue;
            }

            var multipleMessages = forString.split('\r');
            for(var messageNumber = 0; messageNumber < multipleMessages.length; messageNumber++) {
                var messageString = multipleMessages[messageNumber];
                if(messageString === '') {
                    continue;
                }

                var response = parseOBDCommand(messageString);

                // console.log(response.name + " = " + response.value)

                OBD.emit("data", { name: response.name, value: response.value })

                // fs.appendFile("log.txt", response.name + " = " + response.value, () => {})

                // self.emit('dataReceived', reply);
                // if(self.debug) console.log('Data recieved: '+ reply.name +' = '+ reply.value);
            }
        }
    });
}

OBD.write = function (name) {
    write(getPIDByName(name), 1)
}

function write(message, replies) {
    if(!replies) replies = 0;

    if(connected){
        if(queue.length < 256){
            if(replies !== 0){
                queue.push(message + replies + '\r');
            } else {
                queue.push(message + '\r');
            }
        } else {
            console.log('Error: queue overflow');
        }
    }
}

module.exports = OBD;