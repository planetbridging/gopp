import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import { ChakraProvider } from '@chakra-ui/react';


import HomePage from './home';

class App extends Component {
  render() {
    return (
    <ChakraProvider>
      <HomePage />
    </ChakraProvider>
    );
  }
}

export default App;
