import React, { Component } from 'react';
import { Input,Wrap, WrapItem, Tabs, TabList, TabPanels, Tab, TabPanel, Button, Select, Box, Text, Progress, Table, Thead, Tbody, Tr, Th, Td, Link, Textarea } from '@chakra-ui/react';
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
      pcapData: [],
      pcapColumns: [],
      currentPage: 1,
      pageNumber: 1, // Added pageNumber state
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
    console.log(rules,selectedPcap);
    // Parse the rules from the textarea
    /*const parsedRules = rules.split('\n').map((rule) => {
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
      .catch(error => console.error('Error processing PCAP file:', error));*/
  };

  saveCsv = () => {
    // Save the CSV data to a file on the backend
    // Refresh the list of CSV files
  };

  async loadPcap() {
    const { selectedPcap, currentPage } = this.state;
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    try {
      console.log("Loading pcap");
      var getColumns = await axios.get(`${httpUrl}/jsonpcapcolumns/` + selectedPcap);
      var getData = await axios.get(`${httpUrl}/jsonpcap/` + selectedPcap + `?page=${currentPage}&limit=2000`);
      console.log(getColumns.data["columns"]);
      console.log(`${httpUrl}/jsonpcap/` + selectedPcap);
      console.log(getData);
      this.setState({
        pcapData: getData.data,
        pcapColumns: getColumns.data["columns"]
      });
    } catch (ex) {
      console.log("Failed to load pcap");
    }
  }

  handlePreviousPage = () => {
    this.setState(prevState => ({
      pageNumber: Math.max(prevState.pageNumber - 1, 1),
    }), this.loadPcap);
  };

  handleNextPage = () => {
    this.setState(prevState => ({
      pageNumber: prevState.pageNumber + 1,
    }), this.loadPcap);
  };

  renderPcapTable() {
    const { pcapData, pcapColumns,  pageNumber } = this.state;
  
    const handlePageChange = (event) => {
      const newPage = Number(event.target.value);
      this.setState({ pageNumber: newPage }, this.loadPcap);
    };
  
    const renderCellValue = (value) => {
      // If the value is an object, render it as a string
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      // Otherwise, render the value as is
      return value;
    };
  
    return (
      <Box bg='#2D3748'>
        <Box display="flex" alignItems="center" mb={4}>
          <Button onClick={this.handlePreviousPage}>
            Previous
          </Button>
          <Input
            type="number"
            value={pageNumber}
            onChange={handlePageChange}
            mx={2}
            w={16}
          />
          <Button onClick={this.handleNextPage}>
            Next
          </Button>
        </Box>
        <Table variant='striped' colorScheme='teal' size={"sm"}>
          <Thead>
            <Tr>
              {pcapColumns.map((column, index) => (
                <Th key={index}>{column}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {pcapData.map((packet, index) => (
              <Tr key={index}>
                {pcapColumns.map((column, columnIndex) => (
                  <Td key={columnIndex}>{renderCellValue(packet[column])}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }



  render() {
    const { pcapFiles, selectedPcap, pcapData, pcapColumns, rules } = this.state;

    return (
      <Box p={5}>
        <Box bg='#2D3748' w='100%' p={4} color='white'>
          <Wrap>
            <WrapItem><Button mt={4} onClick={() => this.loadPcap()}>Load pcap</Button></WrapItem>
            <WrapItem><Button mt={4} onClick={this.applyRules}>Apply Rules</Button></WrapItem>
          </Wrap>
        </Box>
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





        <Tabs isFitted variant='enclosed'>
          <TabList mb='1em'>
            <Tab>PCAP</Tab>
            <Tab>CSV</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {pcapData && pcapColumns && this.renderPcapTable()}
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