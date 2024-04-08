import { Box, Image, Wrap, WrapItem, Text, Card, CardHeader, CardBody, CardFooter, Heading, Stack, Link, Button } from '@chakra-ui/react';
import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link as RLink,
  useParams,
} from "react-router-dom";

import TrafficListener from './trafficlistener';

import logo from './imgs/logo.png';
import RecordTraffic from './record';
import DataPreparation from './prepare';


//prod
const protocolPrefix = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
var wsUrl = `${protocolPrefix}//${window.location.host}`;

//testing
wsUrl = 'ws://192.168.0.222:3000';

class HomePage extends Component {

  render() {

    var showTrafficListener = <TrafficListener webSockUrl={wsUrl} />;


    return <Box w="100%" minH={"100vh"} bg='#4A5568'>
      <Router>
        <Box bg='#2D3748' w='100%' p={4} color='white'>
          <Wrap>
            <WrapItem>
              <Image src={logo} alt="Logo" boxSize="50px" objectFit="cover" />
            </WrapItem>
            <WrapItem>
              <Stack>
                <Text fontSize='md'>GOPP</Text>
                <Text fontSize='xs'>Golang packet processing</Text>
              </Stack>
            </WrapItem>
            <WrapItem p="5">
              <Wrap>
                <WrapItem>
                  <RLink to="/"><Button>Home</Button></RLink>
                </WrapItem>
                <WrapItem>
                  <RLink to="/record"><Button>Record</Button></RLink>
                </WrapItem>
                <WrapItem>
                  <RLink to="/preprocessing"><Button>Preprocessing</Button></RLink>
                </WrapItem>
              </Wrap>
            </WrapItem>
          </Wrap>
        </Box>


        <Switch>
          <Route exact path="/">
            {showTrafficListener}
          </Route>

          <Route exact path="/record">
            <RecordTraffic wsUrl={wsUrl} />
          </Route>

          <Route exact path="/preprocessing">
            <DataPreparation wsUrl={wsUrl} />
          </Route>

          

        </Switch>
      </Router>
    </Box>
  }
}

export default HomePage;
