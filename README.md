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