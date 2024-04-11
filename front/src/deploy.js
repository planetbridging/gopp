import React, { Component } from 'react';
import axios from 'axios';

class DeployListener extends Component {
  state = {
    inputData: '',
    prediction: null,
  };

  handleInputChange = (e) => {
    this.setState({ inputData: e.target.value });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const httpUrl = this.props.wsUrl.replace('ws://', 'http://');
    const inputData = `inputData=${encodeURIComponent(this.state.inputData)}`;
    try {
      const response = await axios.post(httpUrl + '/predict', inputData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
  
      this.setState({ prediction: response.data.prediction });
    } catch (error) {
      console.error('Error making prediction:', error);
    }
  };
  

  render() {
    const { inputData, prediction } = this.state;

    return (
      <div>
        <h1>Testing showing packet info</h1>
        <form onSubmit={this.handleSubmit}>
          <input
            type="text"
            value={inputData}
            onChange={this.handleInputChange}
            placeholder="Enter input data here"
          />
          <button type="submit">Submit</button>
        </form>
        {prediction && (
          <div>
            <h2>Prediction:</h2>
            <pre>{JSON.stringify(prediction, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }
}

export default DeployListener;