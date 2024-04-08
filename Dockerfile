# Start from the official Go image
FROM golang:1.22.1

# Set the working directory inside the container
WORKDIR /app

# Install libpcap-dev for pcap support
RUN apt-get update && apt-get install -y \
    libpcap-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the Go files into the container
COPY . .

# Download Go module dependencies
RUN go mod download

# Build your application
RUN go build -o engine .

# Expose the port your app runs on
EXPOSE 3000

# Run the executable
CMD ["./engine"]
