const io = require('socket.io-client');
let socket = io('http://localhost:5000');
socket.on('alert', function (data) {
    console.log("Emit from hello: " + data);
});
socket.on('language', (data) => {
    console.log("Emit from language: " + data);
    socket.emit("toctrl", "I need help!");
});
socket.on('yourGroupIs', (data) => {
    console.log("Address: " + data.address);
    console.log('Lat: ' + data.lat);
    console.log('Lng: ' + data.lng);
});
socket.emit('whereIsMyGroup');
socket.emit('hello', "world");
//# sourceMappingURL=test.js.map