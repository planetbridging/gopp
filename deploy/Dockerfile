# Use a base image that includes both Node.js and Python.
FROM nikolaik/python-nodejs:python3.9-nodejs16

# Set the working directory.
WORKDIR /usr/src/app

# Copy the TensorFlow SavedModel into the container.
COPY network_model/ ./network_model/

# Install TensorFlow.js and any other Node.js dependencies.
RUN npm install @tensorflow/tfjs-node

# Install the TensorFlow.js converter.
RUN pip install tensorflowjs

# Use the TensorFlow.js converter to convert the SavedModel to TensorFlow.js format.
# Replace 'YourOutputNodeNames' with the actual names of your model's output nodes, if known.
RUN tensorflowjs_converter --input_format=tf_saved_model --output_node_names='YourOutputNodeNames' --saved_model_tags=serve ./network_model/ ./tfjs_model

# Copy the rest of your application's code into the container.
COPY . .

# Install Node.js dependencies defined in package.json.
RUN npm install

# Expose the port your app runs on.
EXPOSE 8030

# Command to run your app.
CMD ["node", "app.js"]
