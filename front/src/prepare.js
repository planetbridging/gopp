import React, { Component } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel,Button, Select, Box, Text, Progress, Table, Thead, Tbody, Tr, Th, Td, Link, Textarea } from '@chakra-ui/react';
import axios from 'axios';

class DataPreparation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      pcapFiles: [],
      selectedPcap: '',
      processingProgress: 0,
      csvData: [],
      csvFiles: [],
      rules: '',
    };
  }

  componentDidMount() {
    this.fetchPcapFiles();
    this.fetchCsvFiles();
  }

  fetchPcapFiles = () => {
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    axios.get(`${httpUrl}/list-pcap-files`)
      .then(response => this.setState({ pcapFiles: response.data }))
      .catch(error => console.error('Error fetching pcap files:', error));
  };

  fetchCsvFiles = () => {
    // Fetch existing CSV files from backend
  };

  handlePcapSelection = (event) => {
    this.setState({ selectedPcap: event.target.value });
  };

  handleRulesChange = (event) => {
    this.setState({ rules: event.target.value });
  };

  applyRules = () => {
    const { selectedPcap, rules } = this.state;
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');

    // Parse the rules from the textarea
    const parsedRules = rules.split('\n').map((rule) => {
      const [condition, scanType] = rule.split('=>');
      return {
        condition: condition.trim(),
        scanType: scanType.trim(),
      };
    });

    // Send the selected PCAP file and parsed rules to the backend for processing
    axios.post(`${httpUrl}/process-pcap`, { pcapFile: selectedPcap, rules: parsedRules })
      .then(response => {
        // Update `processingProgress` and `csvData` based on the response
        this.setState({
          processingProgress: response.data.progress,
          csvData: response.data.csvData,
        });
      })
      .catch(error => console.error('Error processing PCAP file:', error));
  };

  saveCsv = () => {
    // Save the CSV data to a file on the backend
    // Refresh the list of CSV files
  };

  render() {
    const { pcapFiles, selectedPcap, processingProgress, csvData, csvFiles, rules } = this.state;

    return (
      <Box p={5}>
        <Select placeholder="Select pcap file" value={selectedPcap} onChange={this.handlePcapSelection}>
          {pcapFiles.map((file, index) => (
            <option key={index} value={file.name}>{file.name}</option>
          ))}
        </Select>

        <Textarea
          mt={4}
          placeholder="Enter scan detection rules"
          value={rules}
          onChange={this.handleRulesChange}
        />

        <Button mt={4} onClick={this.applyRules}>Apply Rules</Button>



        <Tabs isFitted variant='enclosed'>
        <TabList mb='1em'>
            <Tab>PCAP</Tab>
            <Tab>CSV</Tab>
        </TabList>
        <TabPanels>
            <TabPanel>
            <p>one!</p>
            </TabPanel>
            <TabPanel>
            <p>two!</p>
            </TabPanel>
        </TabPanels>
        </Tabs>

      </Box>
    );
  }
}

export default DataPreparation;