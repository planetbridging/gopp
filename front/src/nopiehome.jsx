import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      trafficInfoByDevice: {},
      portTrafficInfo: {}, // New state to hold per-port traffic info
      ws: null,
    };
  }

  componentDidMount() {
    const ws = new WebSocket('ws://192.168.0.222:3000/ws');

    ws.onopen = () => {
      console.log('Connected to server');
    };

    ws.onmessage = (event) => {
      const { device, bytes, perPortBytes, timestamp } = JSON.parse(event.data);
      const timestampMs = new Date(timestamp).getTime();
      const oneMinuteAgo = Date.now() - 60000;

      this.setState((prevState) => {
        // Update device traffic info
        const updatedTrafficInfo = { ...prevState.trafficInfoByDevice };
        updatedTrafficInfo[device] = (updatedTrafficInfo[device] || []).filter(d => d.timestamp > oneMinuteAgo);
        updatedTrafficInfo[device].push({ timestamp: timestampMs, bytes });

        // Update port traffic info
        const updatedPortTrafficInfo = { ...prevState.portTrafficInfo };
        perPortBytes.forEach(({ port, bytes }) => {
          const portKey = `${device}-${port}`; // Unique key for each device-port pair
          updatedPortTrafficInfo[portKey] = (updatedPortTrafficInfo[portKey] || []).filter(d => d.timestamp > oneMinuteAgo);
          updatedPortTrafficInfo[portKey].push({ timestamp: timestampMs, bytes });
        });

        return { trafficInfoByDevice: updatedTrafficInfo, portTrafficInfo: updatedPortTrafficInfo };
      });
    };

    ws.onclose = () => console.log('Disconnected from server');
    ws.onerror = (error) => console.error('WebSocket error:', error);

    this.setState({ ws });
  }

  componentWillUnmount() {
    if (this.state.ws) this.state.ws.close();
  }

  render() {
    const { trafficInfoByDevice, portTrafficInfo } = this.state;

    return (
      <div>
        <h1>Traffic Information</h1>
        {Object.entries(trafficInfoByDevice).map(([device, data]) => (
          <div key={device}>
            <h2>Device: {device}</h2>
            <LineChart
              width={600}
              height={300}
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                scale="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="bytes" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>

            {/* Render a chart for each port */}
            {Object.entries(portTrafficInfo).filter(([key]) => key.startsWith(device)).map(([key, portData]) => {
              const port = key.split('-')[1];
              return (
                <div key={key}>
                  <h3>Port: {port}</h3>
                  <LineChart
                    width={600}
                    height={300}
                    data={portData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      scale="time"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} />
                    <Legend />
                    <Line type="monotone" dataKey="bytes" stroke="#82ca9d" activeDot={{ r: 8 }} />
                  </LineChart>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
}

export default HomePage;
