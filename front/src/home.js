import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

class HomePage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      devices: {}, // Holds traffic data for each device over the last 60 seconds
      portTrafficData: {}, // Holds arrays of data points for each port for the last 60 seconds
      ws: null,
    };
  }

  componentDidMount() {

    try{

        
        //testing
        //const ws = new WebSocket('ws://192.168.0.222:3000/ws');

        //prod
        //const ws = new WebSocket();
        const protocolPrefix = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocolPrefix}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
        console.log('Connected to server');
        };

        ws.onmessage = (event) => {
        const { device, bytes, perPortBytes, timestamp } = JSON.parse(event.data);
        const timestampMs = new Date(timestamp).getTime();
        const oneMinuteAgo = timestampMs - 60000;

        this.setState((prevState) => {
            const devices = { ...prevState.devices };
            const portTrafficData = { ...prevState.portTrafficData };

            // Update device traffic data, keeping only the last 60 seconds
            const deviceData = devices[device] || [];
            devices[device] = [...deviceData, { timestamp: timestampMs, bytes }].filter(d => d.timestamp > oneMinuteAgo);

            // Update port traffic data for the device
            perPortBytes.forEach(({ port, bytes }) => {
            const portKey = `${device}-${port}`;
            const portData = portTrafficData[portKey] || [];
            portTrafficData[portKey] = [...portData, { timestamp: timestampMs, bytes }].filter(d => d.timestamp > oneMinuteAgo);
            });

            return { devices, portTrafficData };
        });
        };

        ws.onclose = () => console.log('Disconnected from server');
        ws.onerror = (error) => console.error('WebSocket error:', error);

        this.setState({ ws });
    }catch(ex){
        console.log(ex);
    }
  }

  componentWillUnmount() {
    if (this.state.ws) this.state.ws.close();
  }

  aggregatePortData(device) {
    const { portTrafficData } = this.state;
    const aggregatedData = Object.entries(portTrafficData)
      .filter(([key]) => key.startsWith(`${device}-`))
      .map(([key, data]) => {
        const totalBytes = data.reduce((acc, { bytes }) => acc + bytes, 0);
        return { name: key.split('-')[1], value: totalBytes };
      });

    return aggregatedData;
  }

  generateColor(port) {
    // Simple hash function to convert a port number into a 6-digit hexadecimal code
    let hash = 0;
    const portString = port.toString();
    for (let i = 0; i < portString.length; i++) {
      hash = portString.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  }
  

  render() {
    const { devices } = this.state;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']; // Colors for the pie chart sectors

    return (
      <div>
        <h1>Traffic Information - Last 60 Seconds</h1>
        {Object.entries(devices).map(([device, trafficData]) => (
          <div key={device}>
            <h2>Device: {device}</h2>
            {/* Line chart for overall traffic data */}
            <LineChart width={600} height={300} data={trafficData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" scale="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
              <YAxis />
              <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} />
              <Legend />
              <Line type="monotone" dataKey="bytes" stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>

            {/* Pie chart for aggregated port traffic data */}
            <PieChart width={400} height={400}>
            <Pie dataKey="value" isAnimationActive={false} data={this.aggregatePortData(device)} cx={200} cy={200} outerRadius={80} fill="#8884d8" label={({ name, value }) => `${name}: ${value}`}>
  {this.aggregatePortData(device).map((entry, index) => (
    <Cell key={`cell-${index}`} fill={this.generateColor(entry.name)} />
  ))}
</Pie>

              <Tooltip />
            </PieChart>
          </div>
        ))}
      </div>
    );
  }
}

export default HomePage;