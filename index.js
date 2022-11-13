const express = require("express")
const path = require("path")
const app = express();

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


var pollingRate = 1000;


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
    var num = randomIntFromInterval(0,110)
    console.log(num)
    io.emit('gaugeUpdate', { value: num, otherProperty: 'other value' })
}, pollingRate)

console.log("Server Listening on Port 80")
server.listen(80)