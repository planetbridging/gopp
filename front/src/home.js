import { Box, Image, Wrap, WrapItem, Text, Card, CardHeader, CardBody, CardFooter, Heading, Stack, Link } from '@chakra-ui/react';
import React, { Component } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import TrafficListener from './trafficlistener';

import logo from './imgs/logo.png';


 //prod
 const protocolPrefix = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
 var wsUrl = `${protocolPrefix}//${window.location.host}`;

 //testing
 //wsUrl = 'ws://192.168.0.222:3000';

class HomePage extends Component {
  

  



  render() {
    
    var showTrafficListener= <TrafficListener webSockUrl={wsUrl} />;


    return <Box w="100%" minH={"100vh"} bg='#4A5568'>

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
                <Link href='/'>
                  Home
                </Link>
              </WrapItem>
            </Wrap>
          </WrapItem>
        </Wrap>
      </Box>
      {showTrafficListener}
    </Box>
  }
}

export default HomePage;
