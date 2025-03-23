"use strict";
//TODO:  My system doesn't support IPv6 rn. fix it
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const FORWARD_PORT = 53;
const FORWARD_DNS_V4 = "8.8.8.8";
const FORWARD_DNS_V6 = "2001:4860:4860::8888";
const server = dgram_1.default.createSocket({ type: "udp4", reuseAddr: true });
// To parse msg recieved
const parseDomainName = (msg, offset) => {
    let domain = "";
    let length = msg[offset];
    while (length !== 0) {
        domain +=
            msg.slice(offset + 1, offset + 1 + length).toString("ascii") + ".";
        offset += length + 1;
        length = msg[offset];
    }
    return { name: domain.slice(0, -1), nextOffset: offset + 1 };
};
//Send reposne to google's dns resolver
const handleMessage = (msg, rinfo, forwardDNS) => {
    console.log(`Forwarding query from ${rinfo.address}:${rinfo.port}`);
    const forwardSocket = dgram_1.default.createSocket("udp4");
    forwardSocket.send(msg, FORWARD_PORT, forwardDNS, () => {
        console.log(`Query sent to ${forwardDNS}`);
    });
    forwardSocket.on("message", (response) => {
        console.log(`Sent resolved response to ${rinfo.address}:${rinfo.port}`);
        server.send(response, rinfo.port, rinfo.address, () => {
            console.log(`Sent resolved response to ${rinfo.address}:${rinfo.port}`);
        });
        setTimeout(() => forwardSocket.close(), 500);
    });
    forwardSocket.on("error", (err) => {
        console.log(`Error forwarding DNS query : ${err.message}`);
        forwardSocket.close();
    });
};
//Message handler for both
//msg is the actual data recieved
// rinfo is the information about remote user
server.on("message", (msg, rinfo) => {
    if (msg.length < 12) {
        console.error(`Received invalid DNS packet from ${rinfo.address}:${rinfo.port}`);
        return;
    }
    handleMessage(msg, rinfo, FORWARD_DNS_V4);
});
server.on("error", (err) => {
    console.log(`Server Error: ${err.message}`);
});
// Start servers
server.bind(53, "0.0.0.0", () => {
    console.log("DNS server running on IPv4/IPv6 (UDP)");
});
