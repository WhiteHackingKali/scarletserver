const WebSocket = require("ws");
const http = require("http");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let dashboards = new Set();
let executors = new Set();

function send(ws, type, data = {}) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type,
            data,
            timestamp: Date.now()
        }));
    }
}

function broadcastExecutors(type, data = {}) {
    executors.forEach(ws => send(ws, type, data));
}

function broadcastDashboards(type, data = {}) {
    dashboards.forEach(ws => send(ws, type, data));
}

wss.on("connection", (ws) => {

    console.log("🔌 Nova conexão");

    ws.on("message", (raw) => {

        let msg;

        try {
            msg = JSON.parse(raw);
        } catch {
            console.log("⚠️ JSON inválido:", raw.toString());
            return;
        }

        const { type, data } = msg;

        console.log("📩", type, data);

        switch (type) {

            // =============================
            // Dashboard autenticação
            // =============================
            case "auth": {

                ws.role = "dashboard";
                dashboards.add(ws);

                console.log("🖥 Dashboard conectado:", data?.email);

                send(ws, "status", {
                    connectedExecutors: executors.size
                });

                break;
            }

            // =============================
            // Executor Roblox conecta
            // =============================
            case "identify": {

                ws.role = "executor";
                executors.add(ws);

                console.log("🎮 Executor conectado");

                broadcastDashboards("status", {
                    connectedExecutors: executors.size
                });

                break;
            }

            // =============================
            // Comandos do Dashboard
            // =============================
            case "command": {

                const command = data?.command;

                console.log("⚡ Command:", command);

                if (command === "ping") {

                    broadcastExecutors("ping");

                    send(ws, "log", {
                        message: "Ping enviado aos executores"
                    });

                }

                if (command === "execute_script") {

                    broadcastExecutors("execute_script", {
                        script: data.script
                    });

                    send(ws, "log", {
                        message: "Script enviado para executores"
                    });

                }

                break;
            }

            // =============================
            // Logs do executor
            // =============================
            case "remote_log": {

                broadcastDashboards("remote_log", data);
                break;

            }

            // =============================
            // Resultado de execução
            // =============================
            case "execution_result": {

                broadcastDashboards("execution_result", data);
                break;

            }

            // =============================
            // Lista de players
            // =============================
            case "players": {

                broadcastDashboards("players", data);
                break;

            }

            default:
                console.log("❓ Tipo desconhecido:", type);
        }

    });

    ws.on("close", () => {

        if (ws.role === "dashboard") {
            dashboards.delete(ws);
        }

        if (ws.role === "executor") {
            executors.delete(ws);

            broadcastDashboards("status", {
                connectedExecutors: executors.size
            });
        }

        console.log("❌ Conexão fechada");
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("🚀 WebSocket server rodando na porta", PORT);
});
