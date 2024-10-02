let espacioBotones = document.getElementById('botones');
let botones = espacioBotones.getElementsByTagName('button');
let jugadorTxt = document.getElementById("jugador");
let mensaje = document.getElementById("mensaje");
let btnStart = document.getElementById("start");
let btnSala = document.getElementById("sala");
let formularioCodigo = document.getElementById("formularioCodigo");

let jugador = 0;
let jugadoresListos = 0;
let contador = 0;
let start = false;
let signos = ['X', '0'];
let Jugador1 = 1;
let Jugador2 = 0;
let tablero = ['', '', '', '', '', '', '', '', ''];
let empate = false;
let ganador = false;
let reinicio = 0;
let codigoSala = null;

const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log('Conexión establecida con el servidor');
};

btnStart.addEventListener('click', function() {
    if (btnStart.textContent === 'Iniciar otra vez!') {
        iniciarOtraVez();
        jugadoresListos = 1;
        mensaje.style.opacity = 0;
        let mensajeParaWS = {
            type: 'reinicio',
            jugadoresListos: jugadoresListos 
        };
        ws.send(JSON.stringify(mensajeParaWS));
        btnStart.textContent = 'Esperando...';
        btnStart.style.color = 'rgb(177, 177, 177)';
        btnStart.style.backgroundColor = 'rgb(155, 155, 155)'; 
    } else {
        jugadoresListos = 1; 
        let mensajeParaWS = {
            type: 'listo',
            jugadoresListos: jugadoresListos
        }
        ws.send(JSON.stringify(mensajeParaWS)); 
        btnStart.textContent = 'Esperando...';
        btnStart.style.color = 'rgb(177, 177, 177)';
        btnStart.style.backgroundColor = 'rgb(155, 155, 155)'; 
    }
});

ws.onmessage = function(event) {
    let mensajeWS = event.data;
    let mensajeWSParseado = JSON.parse(mensajeWS);

    switch (mensajeWSParseado.type) {
        case 'error':
            console.error(mensajeWSParseado.mensaje);
            if (mensajeWSParseado.mensaje === 'La sala está llena') {
                alert('La sala está llena. Intenta con otro código.'); 
            }
            break;
        case 'jugadores':
            let b = mensajeWSParseado.reinicio;
            reinicio = b;
            let c = mensajeWSParseado.codigoSala;
            codigoSala = c;
            btnSala.textContent = `Sala ${mensajeWSParseado.codigoSala}`;
            let d = mensajeWSParseado.numeroJugador;
            jugador = d;
            jugadorTxt.textContent =  `Jugador ${jugador}`;
            console.log(`Eres el jugador ${mensajeWSParseado.jugador}`);
            console.log(`Estas en la sala ${mensajeWSParseado.codigoSala}`);
            break;
        case 'actualizarJugadores':
            mensajeWSParseado.jugadores.forEach(jugadorActualizado => {
                if (jugadorActualizado.id === jugador) { 
                    jugador = jugadorActualizado.numeroJugador;
                    jugadorTxt.textContent = `Jugador ${jugador}`; 
                    btnSala.textContent = `Sala ${codigoSala}`;
            }});
            console.log('Lista de jugadores actualizada:', mensajeWSParseado.jugadores);
            break;
        case 'listo':
            if (!start) {
                start = true;
                btnStart.disabled = true;
                btnStart.style.backgroundColor = 'gray'; 
                btnStart.style.color = 'white';
                btnStart.textContent = 'A jugar!';
                console.log("Iniciemos");            
                movimiento();
            }
            break;
        case 'movimiento':
            tablero = mensajeWSParseado.tablero;
            if (mensajeWSParseado.turno == 1) {
                Jugador1 = 0;
                Jugador2 = 1;
            } else if (mensajeWSParseado.turno == 2) {
                Jugador1 = 1;
                Jugador2 = 0;
            }
            let a = mensajeWSParseado.contador;
            contador = a;
            actualizarInterfaz(); 
            break;
        case 'ganador':
            if (mensajeWSParseado.start === false) { 
                start = false;
                let jugadorGanador = mensajeWSParseado.jugadorGanador;
                console.log(`Ganador ${jugadorGanador}`);

                for (let j = 0; j < botones.length; j++) {
                    botones[j].disabled = true;
                } 

                if ((jugadorGanador == `Jugador 1` && jugador == 1) || (jugadorGanador == `Jugador 2` && jugador == 2)) {
                    mensaje.style.opacity = 1;
                    mensaje.textContent = `¡Felicidades, has ganado!`;
                    btnStart.disabled = false;
                    btnStart.style.backgroundColor = 'white'; 
                    btnStart.style.color = 'gray';
                    btnStart.textContent = 'Iniciar otra vez!';
                    jugadoresListos = 0;
                } else if ((jugadorGanador == `Jugador 2` && jugador == 1) || (jugadorGanador == `Jugador 1` && jugador == 2)) {
                    mensaje.style.opacity = 1;
                    mensaje.textContent = `Lo sentimos, ${jugadorGanador} ha ganado.`;
                    btnStart.disabled = false;
                    btnStart.style.backgroundColor = 'white'; 
                    btnStart.style.color = 'gray';
                    btnStart.textContent = 'Iniciar otra vez!';
                    jugadoresListos = 0;
                }
            }
            break;
        case 'empate':
            if (mensajeWSParseado.empate == true && mensajeWSParseado.start == false && ganador == false) {
                empate = true;
                start = false;
                console.log("Empate");
                for (let j = 0; j < botones.length; j++) {
                    botones[j].disabled = true;
                } 
                mensaje.style.opacity = 1;
                mensaje.textContent = "Empate, juega otra vez";
                btnStart.disabled = false;
                btnStart.style.backgroundColor = 'white'; 
                btnStart.style.color = 'gray';
                btnStart.textContent = 'Iniciar otra vez!';
                Jugador1 = 1
                Jugador2 = 0
            }
            break;
    }
}

function movimiento() {
    if (Jugador1 === 1 && jugadorTxt.textContent == 'Jugador 1' && jugador == 1) {
        console.log(`te toca jugar jugador 1`);
        habilitarBotones(); 
    } else if (Jugador1 === 0 && jugadorTxt.textContent == 'Jugador 2' && jugador == 2) {
        console.log(`te toca jugar jugador 2`);
        habilitarBotones(); 
    } else {
        deshabilitarBotones(); 
    }

    for (let i = 0; i < botones.length; i++) {
        botones[i].addEventListener('click', function() {
            if (tablero[i] === '') { 
                if (jugadorTxt.textContent == 'Jugador 1' && jugador == 1) {
                    botones[i].textContent = 'X';
                    tablero[i] = 'X';
                } else if (jugadorTxt.textContent == 'Jugador 2' && jugador == 2) {
                    botones[i].textContent = '0';
                    tablero[i] = '0';
                } else {
                    console.log('ERROR');
                    return;
                }
                botones[i].disabled = true; 

                let mensajeParaWS2 = {
                    type: 'movimiento2',
                    Jugador1: Jugador1,
                    Jugador2: Jugador2,
                    tablero: tablero
                }
                ws.send(JSON.stringify(mensajeParaWS2)); 
            }
        });
    }
}

function habilitarBotones() {
    for (let i = 0; i < botones.length; i++) {
        if (tablero[i] === '') { 
            botones[i].disabled = false;
        }
    }
}

function deshabilitarBotones() {
    for (let i = 0; i < botones.length; i++) {
        botones[i].disabled = true;
    }
}

function actualizarInterfaz() {
    if (Jugador1 === 1 && jugadorTxt.textContent == 'Jugador 1' && jugador == 1 ) {
        console.log(`te toca jugar jugador 1`);
        habilitarBotones(); 
    } else if (Jugador1 === 0 && jugadorTxt.textContent == 'Jugador 2' && jugador == 2) {
        console.log(`te toca jugar jugador 2`);
        habilitarBotones(); 
    } else {
        console.log('Espera tu turno');
        deshabilitarBotones(); 
    }

    for (let i = 0; i < tablero.length; i++) {
        let variable = tablero[i];
        botones[i].textContent = variable;
    }
}

function iniciarOtraVez() {
    Jugador1 = 1;
    Jugador2 = 0;
    tablero = ['', '', '', '', '', '', '', '', ''];
    contador = 0;
    start = false;
    empate = false;
    ganador = false;
    mensaje.style.opacity = '0';

    for (let j = 0; j < botones.length; j++) {
        botones[j].textContent = '';
        botones[j].disabled = false;
    }
}

let counterclicksala = 0;

btnSala.addEventListener('click', function() {
    counterclicksala++;
    if (counterclicksala == 1) {
        formularioCodigo.style.opacity = '1';
        codigoSala1();
    } else {
        formularioCodigo.style.opacity = '0';
        counterclicksala = 0;
    }
})

function codigoSala1() {
    formularioCodigo.addEventListener('submit', function(event) {
        event.preventDefault();
        codigoSala = document.getElementById("codigo").value;
        document.getElementById("codigo").value = '';
        formularioCodigo.style.opacity = '0';
        counterclicksala = 0; 

        iniciarOtraVez(); 

        ws.send(JSON.stringify({
            type: 'codigoSala',
            codigo: codigoSala
        }));
    });
}