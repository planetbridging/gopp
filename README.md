# GOPP Project

## Overview
GOPP (Go Packet Processor) is a real-time network traffic monitoring tool built with Go and leveraging GoFiber for efficient network communication. It captures and analyzes TCP packets, providing insights into traffic data per device and port.

## Features
- Real-time traffic monitoring
- Detailed per-port and per-device traffic data
- WebSocket-based live data streaming to frontend
- Easy deployment with Docker

## Prerequisites
- Go (version 1.22.1 or higher)
- Docker and Docker Compose
- libpcap-dev for packet capture functionalities

## Installation

Clone the repository:

```bash
git clone https://github.com/planetbridging/gopp.git
cd gopp
docker-compose up --build
```

Running golang without docker cmd it needs root:
```bash
sudo /usr/local/go/bin/go run .
```

Running react in dev mode simply cd to front and npm start and change testing to the ip of the running golang server:

//prod
const protocolPrefix = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
var wsUrl = `${protocolPrefix}//${window.location.host}`;

//testing
//wsUrl = 'ws://192.168.0.222:3000';

to
wsUrl = 'ws://192.168.0.222:3000';


Once finished changes comment out wsUrl then run npm run build and delete pcap folder in the build.


Pcap to csv rules examples

```bash
contain,GET,http,unmalicious
contain,POST,http,unmalicious
contain,HEAD,http,unmalicious
layers.ICMPv4,type=ICMPv4TypeEchoRequest,ping,maybemalicious
layers.TCP,tcp.SYN && !tcp.ACK && len(tcp.Options) > 0,nmapscan,malicious
```

Can generate traffic with script like this, just replace ip and/or link
```bash
https://github.com/planetbridging/Python/blob/master/webdatagen.py
```