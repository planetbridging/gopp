import React, { Component } from 'react';
import { VStack ,Input,Wrap, WrapItem, Tabs, TabList, TabPanels, Tab, TabPanel, Button, Select, Box, Text, Progress, Table, Thead, Tbody, Tr, Th, Td, Link, Textarea } from '@chakra-ui/react';
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
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    axios.get(`${httpUrl}/list-csv-files`)
      .then(response => this.setState({ csvFiles: response.data }))
      .catch(error => console.error('Error fetching pcap files:', error));
  };

  handlePcapSelection = (event) => {
    this.setState({ selectedPcap: event.target.value });
  };

  handleRulesChange = (event) => {
    this.setState({ rules: event.target.value });
  };

  applyRules = (save = false) => {
    const { selectedPcap, rules } = this.state;
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    console.log(rules, selectedPcap);
  
    // Send the selected PCAP file, rules, and save flag to the backend for processing
    axios.post(`${httpUrl}/pcap-rules`, { filename: selectedPcap, rules: rules, save: save })
      .then(response => {
        // Convert the CSV data to an array of objects
        const csvData = this.parseCsvData(response.data);
  
        
  
        // Refresh the list of CSV files if the rules were saved
        if (save) {
          this.fetchCsvFiles();
        }else{
          // Update the state with the processed CSV data
          this.setState({
            csvData: csvData,
          });
        }
      })
      .catch(error => console.error('Error processing PCAP file:', error));
  };

  parseCsvData = (csvString) => {
    const lines = csvString.split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
        const row = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j];
        }
        data.push(row);
      }
    }

    return data;
  };

  renderCsvTable = () => {
    const { csvData } = this.state;

    if (csvData.length === 0) {
      return <Text>No CSV data available.</Text>;
    }

    const headers = Object.keys(csvData[0]);

    return (
      <Table variant="striped" colorScheme="teal" size="sm">
        <Thead>
          <Tr>
            {headers.map((header, index) => (
              <Th key={index}>{header}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {csvData.map((row, index) => (
            <Tr key={index}>
              {headers.map((header, columnIndex) => (
                <Td key={columnIndex}>{row[header]}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    );
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
    const { pcapFiles, selectedPcap, pcapData, pcapColumns, rules,csvFiles } = this.state;



    var showCsvFiles = <div>No csv files?</div>


    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');

    if(csvFiles && csvFiles != undefined){
      showCsvFiles = <VStack mt={4} spacing={4} align="stretch">
    {csvFiles.map((file, index) => (
      <Box key={index} p={4} borderWidth="1px" borderRadius="lg">
        <Text>Name: {file.name}</Text>
        <Text>Date: {file.date}</Text>
        <Text>Size: {file.size} bytes</Text>
        <Link href={httpUrl + file.download} isExternal color="teal.500">
          Download 
        </Link>
      </Box>
    ))}
  </VStack>
    }

    return (
      <Box p={5}>
        <Box bg='#2D3748' w='100%' p={4} color='white'>
          <Wrap>
            <WrapItem><Button mt={4} onClick={() => this.loadPcap()}>Load pcap</Button></WrapItem>
            <WrapItem><Button mt={4} onClick={() => this.applyRules(false)}>Apply Rules</Button></WrapItem>
            <WrapItem><Button mt={4} onClick={() => this.applyRules(true)}>Save Apply Rules</Button></WrapItem>
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
            <Tab>View CSV</Tab>
            <Tab>Download CSV</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              {pcapData && pcapColumns && this.renderPcapTable()}
            </TabPanel>
            <TabPanel>
              <p>Only shows the first 2000 items</p>
              {this.renderCsvTable()}
            </TabPanel>
            <TabPanel>
            <Button mt={4} colorScheme="blue" onClick={this.fetchCsvFiles}>Refresh List</Button>
              {showCsvFiles}
            </TabPanel>
          </TabPanels>
        </Tabs>

      </Box>
    );
  }
}

export default DataPreparation;