var io = require('socket.io')(),
    userCount = 0,
    rooms = {},
    users = [];

exports.listen = function(server) {
    io = io.listen(server);

    io.on('connection', (socket) => {
        socket.on('connect to chat', (name) => {
            ++userCount;
            users.push(name);
            socket.name = name;
            findAndJoinAvailableRoom(socket, name);
            io.to(socket.room).emit('user joined', {
                name: socket.name
            });
            socket.emit('set user name', { name: socket.name });
        });

        socket.on('disconnect', () => {
            --userCount;
            io.to(socket.room).emit('user left', {
                name: socket.name,
            });
            removeParticipant(socket.name, socket.room);
            users.splice(users.indexOf(socket.name), 1);
        });

        socket.on('retrieve stranger name', () => {
            var name = retrieveName(socket.name, socket.room);
            socket.broadcast.to(socket.room).emit('set stranger name', {
                name: name
            });
        });

        socket.on('send message', (stranger) => {
            socket.broadcast.to(socket.room).emit('stranger message', {
                id: stranger.id,
                type: stranger.type,
                class: stranger.class,
                message: stranger.message
            });
        });

        socket.on('typing', () => {
            socket.broadcast.to(socket.room).emit('stranger typing');
        });

        socket.on('stop typing', () => {
            socket.broadcast.to(socket.room).emit('stranger stopped typing');
        });
    });

    function findAndJoinAvailableRoom(socket, name) {
        var noRoomsAvailable = true;
        if (Object.getOwnPropertyNames(rooms).length === 0) {
            createRoom(socket, name);
        } else {
            for (room in rooms) {
                if (rooms[room].length === 1) {
                    addParticipant(socket, name, room);
                    noRoomsAvailable = false;
                    break;
                }
            }
            if (noRoomsAvailable) {
                createRoom(socket, name);
            }
        }
    }

    function createRoom(socket, name) {
        var roomName = randomString();
        socket.room = roomName;
        socket.join(roomName);
        rooms[roomName] = [name];
    }

    function addParticipant(socket, name, room) {
        socket.room = room;
        socket.join(room);
        rooms[room].push(name);
    }

    function retrieveName(name, room) {
        if (rooms[room][0] === name) {
            return rooms[room][0];
        } else {
            return rooms[room][1];
        }
    }

    function removeParticipant(name, room) {
        if (rooms[room]) {
            var indexOfPerson = rooms[room].indexOf(name);
            if (indexOfPerson !== -1) {
                rooms[room].splice(indexOfPerson, 1);
            } else {
                console.log('Person does not exist in room');
            }
            checkIfEmptyRoom(rooms[room]);
        }
    }

    function checkIfEmptyRoom(room) {
        if (!room.length) {
            delete rooms[room];
        }
    }

    function randomString() {
        ranStr = '';
        for (var i = 0; i < 8; i++) {
            ranStr += 'a1b2c3d4e5f6g7h8i9j0klmnopqrstuvwxyz'.charAt(
                Math.floor(Math.random() * (35)));
        }
        return ranStr;
    }
}
