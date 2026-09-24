#!/usr/bin/env node

const net = require("net");
const readline = require("readline");

const MAX_REQUESTS = 99999999999999999999999999999999;
const TIMEOUT_MS = 3000;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, answer => resolve(answer.trim()));
    });
}

function validIPv4(ip) {
    const parts = ip.split(".");

    if (parts.length !== 4) return false;

    return parts.every(part => {
        if (!/^\d+$/.test(part)) return false;

        const n = Number(part);
        return n >= 0 && n <= 255;
    });
}

function validPort(port) {
    const n = Number(port);
    return Number.isInteger(n) && n >= 1 && n <= 65535;
}

function testTCP(host, port) {
    return new Promise(resolve => {
        const socket = new net.Socket();
        const start = process.hrtime.bigint();

        let finished = false;

        function finish(result) {
            if (finished) return;
            finished = true;

            const end = process.hrtime.bigint();
            const latency = Number(end - start) / 1e6;

            socket.destroy();

            resolve({
                ...result,
                latency
            });
        }

        socket.setTimeout(TIMEOUT_MS);

        socket.connect(port, host, () => {
            finish({
                success: true
            });
        });

        socket.on("error", error => {
            finish({
                success: false,
                error: error.code || error.message
            });
        });

        socket.on("timeout", () => {
            finish({
                success: false,
                error: "TIMEOUT"
            });
        });
    });
}

async function main() {
    console.clear();

    console.log("---------------------------------");
    console.log(" |      Falco Is GOAT           |");
    console.log("---------------------------------\n");

    const ip = await ask("Enter IPv4: ");

    if (!validIPv4(ip)) {
        console.log("\n[!] Invalid IPv4 address.");
        rl.close();
        return;
    }

    const portInput = await ask("Enter Port: ");

    if (!validPort(portInput)) {
        console.log("\n[!] Invalid port. Use 1-65535.");
        rl.close();
        return;
    }

    const port = Number(portInput);

    let requestsInput = await ask(`Requests (maximum ${MAX_REQUESTS}): `);
    let requests = Number(requestsInput);

    if (!Number.isInteger(requests) || requests < 1) {
        console.log("\n[!] Requests must be a positive whole number.");
        rl.close();
        return;
    }

    if (requests > MAX_REQUESTS) {
        console.log(`[!] Maximum is ${MAX_REQUESTS}. Using ${MAX_REQUESTS}.`);
        requests = MAX_REQUESTS;
    }

    console.log("\nMode:");
    console.log("[1] Easy   - TCP connectivity test");
    console.log("[2] Normal - TCP latency test");
    console.log("[3] Hard   - TCP reliability test");

    const modeInput = await ask("\nSelect Mode: ");

    const modes = {
        "1": "Easy",
        "2": "Normal",
        "3": "Hard"
    };

    if (!modes[modeInput]) {
        console.log("\n[!] Invalid mode.");
        rl.close();
        return;
    }

    const mode = modes[modeInput];

    console.log("\n---------------------------------");
    console.log("        DDOS STARTED");
    console.log("---------------------------------\n");

    console.log(`Target  : ${ip}:${port}`);
    console.log(`Requests: ${requests}`);
    console.log(`Mode    : ${mode}`);
    console.log("");

    let successful = 0;
    let failed = 0;
    let latencies = [];

    for (let i = 1; i <= requests; i++) {
        const result = await testTCP(ip, port);

        if (result.success) {
            successful++;
            latencies.push(result.latency);

            console.log(
                `[${String(i).padStart(2, "0")}/${requests}] ` +
                `Connected  ${result.latency.toFixed(1)}ms`
            );
        } else {
            failed++;

            console.log(
                `[${String(i).padStart(2, "0")}/${requests}] ` +
                `Failed     ${result.error}`
            );
        }
    }

    console.log("\n---------------------------------");
    console.log("            DDOS   RESULTS");
    console.log("---------------------------------\n");

    console.log(`Successful : ${successful}`);
    console.log(`Failed     : ${failed}`);

    if (latencies.length > 0) {
        const min = Math.min(...latencies);
        const max = Math.max(...latencies);
        const avg =
            latencies.reduce((sum, value) => sum + value, 0) /
            latencies.length;

        console.log(`Average    : ${avg.toFixed(1)}ms`);
        console.log(`Min        : ${min.toFixed(1)}ms`);
        console.log(`Max        : ${max.toFixed(1)}ms`);
    } else {
        console.log("Latency    : N/A");
    }

    console.log("\n---------------------------------");
    console.log("        FUCKING COMPLETED");
    console.log("---------------------------------");

    rl.close();
}

main().catch(error => {
    console.error("\n[!] Unexpected error:", error.message);
    rl.close();
});