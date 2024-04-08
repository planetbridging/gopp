import React, { Component } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Select,
  Switch,
  Text,
  Link,
  VStack
} from '@chakra-ui/react';
import axios from 'axios';

class RecordTraffic extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isRecording: false,
      filename: '',
      filters: { tcp: false, udp: false },
      devices: [],
      selectedDevice: '',
      pcapFiles: [],
    };
  }

  componentDidMount() {
    this.fetchDevices();
    this.fetchPcapFiles();
  }

  fetchDevices = () => {
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    axios.get(`${httpUrl}/list-devices`)
      .then(response => this.setState({ devices: response.data }))
      .catch(error => console.error('Error fetching devices:', error));
  };

  fetchPcapFiles = () => {
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    axios.get(`${httpUrl}/list-pcap-files`)
      .then(response => this.setState({ pcapFiles: response.data }))
      .catch(error => console.error('Error fetching pcap files:', error));
  };

  handleToggle = () => {
    const { isRecording, filename, filters, selectedDevice } = this.state;
    const { wsUrl } = this.props; // Assuming wsUrl is passed as a prop to this component
    const httpUrl = wsUrl.replace('ws://', 'http://');

    this.setState({ isRecording: !isRecording });
    const activeFilters = Object.keys(filters).filter(key => filters[key]).join(', ');

    const endpoint = !isRecording ? '/startrecord' : '/stoprecord';
    const url = `${httpUrl}${endpoint}`;

    if (!isRecording) {
      // Start recording
      axios.post(url, { device: selectedDevice, filename, filter: activeFilters })
        .then(() => {
          alert("Recording started"); // Use more sophisticated UI feedback in a real application
        })
        .catch(err => {
          console.error("Error starting recording:", err);
          // Provide UI feedback for the error
        });
    } else {
      // Stop recording
      axios.post(url)
        .then(() => {
          alert("Recording stopped"); // Use more sophisticated UI feedback in a real application
        })
        .catch(err => {
          console.error("Error stopping recording:", err);
          // Provide UI feedback for the error
        });
    }
  };

  handleFilenameChange = (e) => {
    this.setState({ filename: e.target.value });
  };

  handleFilterChange = (e) => {
    const { filters } = this.state;
    this.setState({ filters: { ...filters, [e.target.name]: e.target.checked } });
  };

  handleDeviceChange = (e) => {
    this.setState({ selectedDevice: e.target.value });
  };

  render() {
    const { isRecording, filename, filters, devices, selectedDevice, pcapFiles } = this.state;

    return (
      <Box p={5}>
        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="record-toggle" mb="0">
            Record Traffic:
          </FormLabel>
          <Switch id="record-toggle" isChecked={isRecording} onChange={this.handleToggle} />
        </FormControl>

        <FormControl mt={4}>
          <FormLabel>Filename:</FormLabel>
          <Input placeholder="Enter filename" value={filename} onChange={this.handleFilenameChange} />
        </FormControl>

        <FormControl mt={4}>
          <FormLabel>Device:</FormLabel>
          <Select placeholder="Select device" value={selectedDevice} onChange={this.handleDeviceChange}>
            {devices.map((device, index) => (
              <option key={index} value={device.name}>{device.name} - {device.description}</option>
            ))}
          </Select>
        </FormControl>

        <FormControl mt={4}>
          <FormLabel>Filters:</FormLabel>
          <Checkbox name="tcp" isChecked={filters.tcp} onChange={this.handleFilterChange}>
            TCP
          </Checkbox>
          <Checkbox name="udp" isChecked={filters.udp} onChange={this.handleFilterChange} ml={4}>
            UDP
          </Checkbox>
        </FormControl>

        <Button mt={4} colorScheme="blue" onClick={this.fetchPcapFiles}>Refresh List</Button>

        <VStack mt={4} spacing={4} align="stretch">
          {pcapFiles.map((file, index) => (
            <Box key={index} p={4} borderWidth="1px" borderRadius="lg">
              <Text>Name: {file.name}</Text>
              <Text>Date: {file.date}</Text>
              <Text>Size: {file.size} bytes</Text>
              <Link href={file.download} isExternal color="teal.500">
                Download
              </Link>
            </Box>
          ))}
        </VStack>
      </Box>
    );
  }
}


export default RecordTraffic;
