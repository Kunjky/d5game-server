const express = require('express')
const app = express()
const http = require('http')
const cors = require('cors')
const { Server } = require('socket.io')
const path = require('path');

require('dotenv').config()

const PORT = process.env.PORT

app.use(express.static(path.join(__dirname, 'build')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
})


const roomList = [...initRooms()]

io.on('connection', (socket) => {
    console.log('User connected: ', socket.id)
    socket.emit('user:created', socket.id)

    // send currently connected socket to client to show user active
    io.emit('user:join-channel', Array.from(socket.adapter.sids.keys()))
    io.emit('room:updated', [...roomList])

    socket.on('disconnect', () => {
        io.emit('user:join-channel', Array.from(socket.adapter.sids.keys()))
    })

    socket.on('user:join-room', (roomId) => {
        let room = roomList.find(room => room.id == roomId)

        if (room.players.length < 2 && socket.rooms.size == 1) {
            socket.join(parseInt(room.id))
            room.players.push(socket.id)
        }

        io.emit('room:updated', [...roomList])
    })

    socket.on('user:left-room', (roomId) => {
        let room = roomList.find(room => room.id == roomId)
        if (room && room.players.length) {
            socket.leave(roomId)
            io.emit('room:updated', [...roomList])
        }

        io.emit('room:updated', [...roomList])
    })



    io.of("/").adapter.on("create-room", (room) => {
        // console.log(`room ${room} was created`);
    });

    io.of("/").adapter.on("join-room", (roomId, id) => {
        console.log(`socket ${id} has joined room ${roomId}`);
    });

    io.of("/").adapter.on("delete-room", (room) => {
        // console.log(`delete room ${room}`);
    });

    io.of("/").adapter.on("leave-room", (roomId, socketId) => {
        console.log(`socket ${socketId} has leave room ${roomId}`);

        let room = roomList.find(room => room.id == roomId)
        if (room == undefined) {
            return
        }

        room.players = [...room.players.filter(playersId => playersId != socketId)]
        socket.to(roomId).emit('resetGame')
        socket.emit('room:updated', [...roomList])
    });


    // Game state

    socket.on('setChoiceOne', (data, roomId) => {
        io.to(roomId).emit('setChoiceOne', data)
    })

    socket.on('setChoiceTwo', (data, roomId) => {
        io.to(roomId).emit('setChoiceTwo', data)
    })

    socket.on('newGame', (data, roomId) => {
        const shuffledCards = shuffleCards()
        io.to(roomId).emit('newGame', shuffledCards)
        io.to(roomId).emit('setTurns', 0)
    })

    socket.on('setCards', (data, roomId) => {
        io.to(roomId).emit('setCards', data)
    })

    socket.on('setTurns', (data, roomId) => {
        io.to(roomId).emit('setTurns', data)
    })

    socket.on('passTurn', (data, roomId) => {
        io.to(roomId).emit('passTurn', data)
    })

    socket.on('addScore', (data, roomId) => {
        io.to(roomId).emit('addScore', data)
    })
})

app.use(cors())


server.listen(PORT, () => {
    console.log(`Server listen on port: ${PORT}`);
})

function initRooms() {
    const roomNames = ['D5', 'D6', 'D7', 'Cafeteria', 'Côn Sơn', 'Trường Sa', 'Hoàng Sa', 'Cát Bà', '2023']
    const roomList = []
    for (let i = 1; i <= 9; i++) {
        const room = {
            id: i,
            players: [],
            name: roomNames[i-1],
        }

        roomList.push(room)
    }

    return roomList
}

const cardImages = [
    { "src": "/img/helmet-1.png", "matched": false },
    { "src": "/img/potion-1.png", "matched": false },
    // { "src": "/img/ring-1.png", "matched": false },
    // { "src": "/img/scroll-1.png", "matched": false },
    // { "src": "/img/shield-1.png", "matched": false },
    // { "src": "/img/sword-1.png", "matched": false },
    // { "src": "/img/helmet-1.png", "matched": false },
    // { "src": "/img/potion-1.png", "matched": false },
    // { "src": "/img/ring-1.png", "matched": false },
    // { "src": "/img/scroll-1.png", "matched": false },
    // { "src": "/img/shield-1.png", "matched": false },
    // { "src": "/img/sword-1.png", "matched": false },
]

function shuffleCards() {
    const shuffledCards = [...cardImages, ...cardImages]
        .sort(() => Math.random() - 0.5)
        .map((card,index) => ({ ...card, id: index }))
    return shuffledCards;
}
