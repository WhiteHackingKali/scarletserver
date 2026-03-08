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

console.log("=================================");
console.log(" Scarlet Panel Debug Server");
console.log("=================================");

wss.on("connection", (ws, req) => {

    const ip = req.socket.remoteAddress;

    console.log("\n[NEW CONNECTION]", ip);

    ws.on("message", (data) => {

        const raw = data.toString();

        console.log("\n[RAW MESSAGE]");
        console.log(raw);

        let msg;

        try {
            msg = JSON.parse(raw);
        } catch (err) {
            console.log("[ERROR] JSON inválido");
            return;
        }

        console.log("[PARSED MESSAGE]", msg);

        switch (msg.type) {

            // ======================
            // IDENTIFY
            // ======================

            case "identify":

                if (msg.client === "dashboard") {

                    dashboardClients.add(ws);
                    ws.clientType = "dashboard";

                    console.log("[DASHBOARD CONNECTED]");
                    console.log("Dashboards:", dashboardClients.size);

                }

                if (msg.client === "game") {

                    gameClients.add(ws);
                    ws.clientType = "game";

                    console.log("[GAME CLIENT CONNECTED]");
                    console.log("Clients:", gameClients.size);

                }

            break;


            // ======================
            // COMMAND FROM DASHBOARD
            // ======================

            case "command":

                console.log("[COMMAND RECEIVED FROM DASHBOARD]");
                console.log(msg);

                gameClients.forEach(client => {

                    if (client.readyState === WebSocket.OPEN) {

                        console.log("[FORWARDING COMMAND TO GAME CLIENT]");

                        client.send(JSON.stringify({
                            type: "execute",
                            command: msg.command,
                            data: msg.data || {}
                        }));

                    }

                });

            break;


            // ======================
            // PLAYERS UPDATE
            // ======================

            case "players":

                console.log("[PLAYERS UPDATE FROM CLIENT]");
                console.log(msg.data);

                dashboardClients.forEach(client => {

                    if (client.readyState === WebSocket.OPEN) {

                        client.send(JSON.stringify(msg));

                    }

                });

            break;


            // ======================
            // EXECUTION RESULT
            // ======================

            case "execution_result":

                console.log("[SCRIPT RESULT]");
                console.log(msg.data);

                dashboardClients.forEach(client => {

                    if (client.readyState === WebSocket.OPEN) {

                        client.send(JSON.stringify(msg));

                    }

                });

            break;


            // ======================
            // LOG
            // ======================

            case "log":

                console.log("[CLIENT LOG]");
                console.log(msg.data);

                dashboardClients.forEach(client => {

                    if (client.readyState === WebSocket.OPEN) {

                        client.send(JSON.stringify(msg));

                    }

                });

            break;


            default:

                console.log("[UNKNOWN MESSAGE TYPE]");
                console.log(msg);

        }

    });


    ws.on("close", () => {

        console.log("\n[CONNECTION CLOSED]");

        dashboardClients.delete(ws);
        gameClients.delete(ws);

        console.log("Dashboards:", dashboardClients.size);
        console.log("Clients:", gameClients.size);

    });


    ws.on("error", (err) => {

        console.log("[SOCKET ERROR]");
        console.log(err);

    });

});

app.get("/", (req,res)=>{

    res.send("Scarlet Debug Server Online");

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log("\nServer rodando na porta:", PORT);
});
