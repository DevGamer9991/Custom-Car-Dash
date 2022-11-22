const express = require("express")
const path = require("path")
const app = express();

var exec = require("child_process").exec;

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// const readline = require("readline").createInterface({
//     input: process.stdin,
//     output: process.stdout
// })

const OBD = require("./serial-obd/obd")

OBD.on("connection", () => {
    console.log("connection")
})

OBD.on("data", (data) => {
    io.emit(data.name, data.value)

    console.log(data.name)
})


OBD.connect("COM7");

pollingRate = 1000;

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

// setInterval(() => {
//     var mph = randomIntFromInterval(0,110)
//     var rpm = randomIntFromInterval(0, 8)
//     var fuel = randomIntFromInterval(0, 100)
//     var temp = randomIntFromInterval(0, 100)

//     io.emit('gaugeUpdate', { mph: mph, rpm: rpm, fuel: fuel, temp: temp })
// }, pollingRate)

server.listen(8080, () => {
    console.log("Server Listening on Port 8080")

    exec('"C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --kiosk http://localhost:8080', function () {

    })
})