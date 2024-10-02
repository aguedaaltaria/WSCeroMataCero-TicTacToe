const WebSocket = require('ws');
const Buffer = require('buffer').Buffer;

const wss = new WebSocket.Server({ port: 8080 });

class Sala {
    constructor(codigo = null) {
        this.jugadores = []; 
        this.jugadoresListos = 0;
        this.start = false;
        this.turno = 0; 
        this.tablero = ['', '', '', '', '', '', '', '', ''];
        this.contador = 0;
        this.empate = false;
        this.reinicio = 0;
        this.jugadorGanador = null;
        this.codigo = codigo || this.generarCodigo(); 
        this.salaFull = false;
    }

    generarCodigo() {
        let caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
        let codigo = '';
        for (let i = 0; i < 4; i++) {
            codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return codigo;
    }

    agregarJugador(jugador) {
        if (this.jugadores.length < 2) { 
            jugador.numeroJugador = this.jugadores.length + 1; 
            this.jugadores.push(jugador);
    
            if (this.jugadores.length === 2) {
                this.salaFull = true;
            }
        } else {
            console.error("La sala está llena. No se pueden agregar más jugadores.");
        }
    }

    removerJugador(jugador) {
        let index = this.jugadores.indexOf(jugador);
        if (index > -1) {
            this.jugadores.splice(index, 1);
        }
        if (this.jugadores.length === 0) { 
            this.reiniciarSala();
        } else if (this.jugadores.length < 2) {
            this.salaFull = false; 
        }
    }

    reiniciarSala() {
        this.jugadores = [];
        this.jugadoresListos = 0;
        this.start = false;
        this.turno = 0;
        this.tablero = ['', '', '', '', '', '', '', '', ''];
        this.contador = 0;
        this.empate = false;
        this.reinicio = 0;
        this.jugadorGanador = null;
        this.salaFull = false;
    }

    estaLlena() {
        return this.jugadores.length === 2;
    }

    estaVacia() {
        return this.jugadores.length === 0;
    }
}

let salas = [];
let reinicio = 0;

wss.on('connection', (ws) => {
    let nuevoJugador = {
        ws: ws,
        id: generarID(),
        numeroJugador: null                          
    };

    let codigoSala = null; 
    let mensajeRecibido = null;
    let salaDisponible = null;
    let sala = null;

    if (!salaDisponible) {
        salaDisponible = salas.find(sala => !sala.estaLlena());
        if (!salaDisponible) {
            salaDisponible = new Sala();
            salas.push(salaDisponible); 
        }
    }

    salaDisponible.agregarJugador(nuevoJugador);
    nuevoJugador.sala = salaDisponible;
    sala = nuevoJugador.sala;
    console.log(`Se ha añadido un nuevo jugador a la sala ${salaDisponible.codigo}`);
    enviarJugadoresALaSala(salaDisponible);

    ws.send(JSON.stringify({ 
        type: 'jugadores', 
        jugador: nuevoJugador.id,
        reinicio: reinicio,
        codigoSala: salaDisponible.codigo,
        numeroJugador: nuevoJugador.numeroJugador
    }));

    ws.on('message', function incoming(message) {
        mensajeRecibido = JSON.parse(Buffer.from(message).toString());
        switch (mensajeRecibido.type) {
            case 'codigoSala':
                codigoSala = mensajeRecibido.codigo;
                salaDisponible = salas.find(sala => sala.codigo === codigoSala);
                if (!salaDisponible) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        mensaje: 'La sala no existe'
                    }));
                    return;
                }
                if (salaDisponible.estaLlena()) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        mensaje: 'La sala está llena'
                    }));
                    return; 
                }
                salaDisponible.agregarJugador(nuevoJugador); 
                nuevoJugador.sala = salaDisponible;
                console.log(`Se ha añadido un nuevo jugador a la sala ${salaDisponible.codigo}`);
                enviarJugadoresALaSala(salaDisponible); 

                ws.send(JSON.stringify({ 
                    type: 'jugadores', 
                    jugador: nuevoJugador.id,
                    reinicio: reinicio,
                    codigoSala: salaDisponible.codigo,
                    numeroJugador: nuevoJugador.numeroJugador
                }));
                sala = nuevoJugador.sala;
                break;
            case 'listo':
                sala.jugadoresListos++;
                if (sala.jugadoresListos == 2) {
                    iniciarJuego(sala);
                }
                break;
            case 'reinicio':
                reinicio++;
                sala.jugadoresListos++;

                if (sala.jugadoresListos === 2) { 
                    iniciarJuego(sala); 
                }
                break;
            case 'movimiento2':
                manejarMovimiento(sala, mensajeRecibido);
                break;
        }
    });

    ws.on('close', () => {
        if (salaDisponible) {
            salaDisponible.removerJugador(nuevoJugador);
            console.log(`Se ha salido un jugador de la sala ${salaDisponible.codigo}`);
            if (salaDisponible.estaVacia()) {
                let index = salas.indexOf(salaDisponible);
                if (index > -1) {
                    salas.splice(index, 1);
                }
                console.log(`Se ha eliminado la sala ${salaDisponible.codigo}`);
            } else {
                enviarJugadoresALaSala(salaDisponible); 
            }
        }
    });
});

function iniciarJuego(sala) {
    sala.start = true;
    sala.turno = 1; 
    sala.tablero = ['', '', '', '', '', '', '', '', ''];
    sala.contador = 0;
    sala.empate = false;
    sala.jugadorGanador = null;

    enviarMensajeALaSala(sala, { 
        type: 'listo',
        start: sala.start  
    });

    sala.jugadoresListos = 0; 
}

function manejarMovimiento(sala, mensajeRecibido) {
    sala.contador++;
    if (mensajeRecibido.Jugador1 == 1) {
        sala.turno = 1;
    } else {
        sala.turno = 2;
    }
    sala.tablero = mensajeRecibido.tablero;

    if (verificarGanador(sala, 'X')) {
        sala.jugadorGanador = "Jugador 1";
    } else if (verificarGanador(sala, '0')) {
        sala.jugadorGanador = "Jugador 2";
    } 

    if (sala.jugadorGanador) {
        sala.ganador = true;
        sala.start = false;

        enviarMensajeALaSala(sala, { 
            type: 'ganador',
            jugadorGanador: sala.jugadorGanador,
            start: sala.start,
            ganador: sala.ganador
        });
    } else {
        if (sala.contador === 9) { 
            sala.empate = true;
            sala.start = false;

            enviarMensajeALaSala(sala, { 
                type: 'empate',
                empate: sala.empate,
                start: sala.start
            });
        }
    }

    enviarMensajeALaSala(sala, { 
        type: 'movimiento',
        tablero: sala.tablero,
        turno: sala.turno, 
        contador: sala.contador
    });
}

function verificarGanador(sala, marca) {
    return  verificarLinea(sala, 0, 1, 2, marca) ||
            verificarLinea(sala, 3, 4, 5, marca) || 
            verificarLinea(sala, 6, 7, 8, marca) || 
            verificarLinea(sala, 0, 3, 6, marca) || 
            verificarLinea(sala, 1, 4, 7, marca) || 
            verificarLinea(sala, 2, 5, 8, marca) || 
            verificarLinea(sala, 0, 4, 8, marca) || 
            verificarLinea(sala, 2, 4, 6, marca);
}

function verificarLinea(sala, a, b, c, marca) {
    return sala.tablero[a] === marca && sala.tablero[b] === marca && sala.tablero[c] === marca;
}

function encontrarSalaLibre() {
    for (let codigo in salas) {
        if (!salas[codigo].estaLlena()) {
            return salas[codigo];
        }
    }

    return new Sala(); 
}

function enviarJugadoresALaSala(sala) {
    let jugadores = sala.jugadores.map(jugador => ({
        id: jugador.id,
        numeroJugador: jugador.numeroJugador
    }));

    let mensaje = {
        type: 'actualizarJugadores',
        jugadores: jugadores 
    };

    enviarMensajeALaSala(sala, mensaje);
}

function generarID() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let codigo = '';
    for (let i = 0; i < 5; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

function enviarMensajeALaSala(sala, mensaje) {
    sala.jugadores.forEach(jugador => {
        if (jugador.ws.readyState === WebSocket.OPEN) {
            jugador.ws.send(JSON.stringify(mensaje));
        }
    });
}

// App ///////

const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ceroMataCero.html')); 
});

const PORT = process.env.PORT ?? 3100;

app.listen(PORT, () => {
    console.log(`server listening on por http://localhost:${PORT}`);
});