const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const dashboardClients = new Set();
const gameClients = new Set();

console.log("Scarlet backend iniciado...");

wss.on("connection", (ws, req) => {
    console.log("Nova conexão WebSocket");

    ws.on("message", (data) => {
        try {
            const msg = JSON.parse(data.toString());

            switch (msg.type) {

                case "identify":
                    if (msg.client === "dashboard") {
                        dashboardClients.add(ws);
                        ws.clientType = "dashboard";
                        console.log("Dashboard conectado");
                    }

                    if (msg.client === "game") {
                        gameClients.add(ws);
                        ws.clientType = "game";
                        console.log("Game client conectado");
                    }
                break;


                case "command":
                    console.log("Comando recebido:", msg);

                    gameClients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: "execute",
                                command: msg.command,
                                data: msg.data || {}
                            }));
                        }
                    });

                break;


                case "response":
                    dashboardClients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(msg));
                        }
                    });
                break;

            }

        } catch (err) {
            console.error("Erro WS:", err);
        }
    });

    ws.on("close", () => {
        dashboardClients.delete(ws);
        gameClients.delete(ws);
        console.log("Cliente desconectado");
    });
});

app.get("/", (req, res) => {
    res.send("Scarlet Panel Backend Online");
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});