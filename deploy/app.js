const express = require('express');
const tf = require('@tensorflow/tfjs-node');
const app = express();
const port = 8030;

// Load the model when the application starts
const modelUrl = 'file://tfjs_model/model.json';
let model;

async function loadModel() {
  try {
    model = await tf.loadGraphModel(modelUrl);
    console.log('Model loaded successfully');
  } catch (error) {
    console.error('Error loading the model:', error);
    process.exit(1); // Exit the process if model loading fails
  }
}

loadModel();

// Serve the testing page with a form
app.get('/testing', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Test Model</title>
      </head>
      <body>
        <h1>Model Test Form</h1>
        <form action="/predict" method="post">
          <input type="text" name="inputData" placeholder="Enter input data here" />
          <input type="submit" value="Submit" />
        </form>
      </body>
    </html>
  `);
});

// Use body-parser middleware to parse form data
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

// Adjust the /predict route to process submitted form data
app.post('/predict', async (req, res) => {
  try {
    // Preprocess the input data
    const inputFields = req.body.inputData.split(',');
    const payloadData = inputFields[inputFields.length - 1].split(' ').map(Number);
    const paddedPayloadData = padArray(payloadData, 3000);
    const inputTensor = tf.tensor2d([paddedPayloadData], [1, 3000]);

    // Make a prediction using the loaded model
    const prediction = await model.predict(inputTensor);
    const predictionArray = prediction.arraySync()[0];

    // Print the predictions
    /*console.log('Predictions:');
    console.log(`HTTP Scan: ${predictionArray[0]}`);
    console.log(`Ping Scan: ${predictionArray[1]}`);
    console.log(`Nmap Scan: ${predictionArray[2]}`);
    console.log(`Unmalicious: ${predictionArray[3]}`);
    console.log(`Maybe Malicious: ${predictionArray[4]}`);
    console.log(`Malicious: ${predictionArray[5]}`);*/

    res.json({ prediction: predictionArray });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during prediction' });
  }
});

// Function to pad an array with zeros
function padArray(array, targetLength) {
  const paddedArray = [...array];
  while (paddedArray.length < targetLength) {
    paddedArray.push(0);
  }
  return paddedArray;
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});