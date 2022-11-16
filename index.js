const express = require("express")
const path = require("path")
const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const OBDReader = require("./serial-obd/obd")

pollingRate = 1000;

console.log(((parseInt("c3", 16) * 256) + parseInt("1f", 16)) / 4)

console.log(Math.round(parseInt("70", 16) / 1.609344))

console.log(parseInt("", 16))

OBDReader.connect();

app.use("/deps", express.static("deps"))
app.use("/socket.io", express.static("node_modules/socket.io/client-dist/socket.io"))

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"))
});

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

setInterval(() => {
    var mph = randomIntFromInterval(0,110)
    var rpm = randomIntFromInterval(0, 8)
    var fuel = randomIntFromInterval(0, 100)
    var temp = randomIntFromInterval(0, 100)

    io.emit('gaugeUpdate', { mph: mph, rpm: rpm, fuel: fuel, temp: temp })
}, pollingRate)

console.log("Server Listening on Port 80")
server.listen(80)