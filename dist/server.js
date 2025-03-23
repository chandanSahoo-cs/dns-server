"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dgram_1 = __importDefault(require("dgram"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const port = 53;
const server4 = dgram_1.default.createSocket("udp4");
const server6 = dgram_1.default.createSocket("udp6");
// To parse msg recieved 
const parseDomainName = (msg, offset) => {
    let domain = "";
    let length = msg[offset];
    while (length !== 0) {
        domain += msg.slice(offset + 1, offset + 1 + length).toString("ascii") + ".";
        offset += length + 1;
        length = msg[offset];
    }
    return { name: domain.slice(0, -1), nextOffset: offset + 1 };
};
//msg is the actual data recieved
// rinfo is the information about remote user
server4.on("message", (msg, rinfo) => {
    // console.log(`Received DNS query from ${rinfo.address}:${rinfo.port}`)
    // console.log(msg);
    const transactionId = msg.slice(0, 2);
    const flags = msg.slice(2, 4);
    const questionCount = msg.readUInt16BE(4);
    let offset = 12;
    let queries = [];
    for (let i = 0; i < questionCount; i++) {
        const { name, nextOffset } = parseDomainName(msg, offset);
        queries.push(name);
        offset = nextOffset + 4;
    }
    console.log(`Queries recieved: ${queries.join(", ")}`);
    let responseSections = [];
    for (const domain of queries) {
        responseSections.push(Buffer.concat([
            Buffer.from([0xC0, 0x0C]),
            Buffer.from([0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x3c, 0x00, 0x04]),
            Buffer.from([1, 2, 3, 4])
        ]));
    }
    const response = Buffer.concat([
        transactionId,
        Buffer.from([0x81, 0x80]), // Flags (Standard response, recursion available)
        msg.slice(4, 6), // Original QDCOUNT
        Buffer.from([(questionCount >> 8) & 0xff, questionCount & 0xff]), // ANCOUNT (same as QDCOUNT)
        Buffer.from([0x00, 0x00]), // NSCOUNT
        Buffer.from([0x00, 0x00]), // ARCOUNT
        msg.slice(12, offset), // Question Section
        ...responseSections // All answer sections
    ]);
    // const {name : domain,nextOffset} = parseDomainName(msg,12);
    // console.log(`Received query for : ${domain}`)
    server4.send(response, rinfo.port, rinfo.address, () => {
        console.log(`Sent response to ${rinfo.address}:${rinfo.port}`);
    });
});
server6.on("message", (msg, rinfo) => {
    console.log(`Received DNS query from ${rinfo.address}:${rinfo.port}`);
    console.log(msg);
});
server4.bind(port, "0.0.0.0", () => {
    console.log("DNS server running on IPv4 (UDP)");
});
server6.bind(port, "::", () => {
    console.log("DNS server running on IPv6 (UDP)");
});
