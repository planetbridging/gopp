package main

import (
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/websocket/v2"
    "github.com/google/gopacket"
    "github.com/google/gopacket/layers"
    "github.com/google/gopacket/pcap"
)

// PerPortTrafficInfo holds the bytes transferred for a specific port.
type PerPortTrafficInfo struct {
    Port  uint16 `json:"port"`
    Bytes uint64 `json:"bytes"`
}

// TrafficInfo holds the overall and per-port traffic data, along with the maximum traffic on any port.
type TrafficInfo struct {
    Device       string               `json:"device"`
    Bytes        uint64               `json:"bytes"`
    PerPortBytes []PerPortTrafficInfo `json:"perPortBytes"`
    MaxPortBytes uint64               `json:"maxPortBytes"` // Maximum bytes observed on any port
    Timestamp    string               `json:"timestamp"`
}

func main() {

    ensureDirExists("./front/build/pcap")

    app := fiber.New()

    app.Use(cors.New(cors.Config{
        AllowOrigins: "*",
        AllowMethods: "GET,POST",
        AllowHeaders: "Origin, Content-Type, Accept",
    }))

    app.Get("/traffic", websocket.New(handleWebSocket))

    go captureTraffic(app)

    /*app.Get("/", func(c *fiber.Ctx) error {
        return c.SendString("Hello, World!")
    })*/

	// Serve React static files - adjust "build" to the path of your React build directory
    app.Static("/", "./front/build")

    // This route handler can be removed or adjusted if you want to use React Router for routing
    app.Get("/", func(c *fiber.Ctx) error {
        return c.SendFile("./front/build/index.html")
    })

    app.Get("/record", func(c *fiber.Ctx) error {
        return c.SendFile("./front/build/index.html")
    })

    app.Get("/preprocessing", func(c *fiber.Ctx) error {
        return c.SendFile("./front/build/index.html")
    })

    setupRoutes(app)

    go func() {
        if err := app.Listen(":3000"); err != nil {
            fmt.Println("Error running server:", err)
        }
    }()

    // Wait for termination signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
    <-sigChan

    // Graceful shutdown
    fmt.Println("Shutting down server...")
    if err := app.Shutdown(); err != nil {
        fmt.Println("Error shutting down Fiber app:", err)
    }
    fmt.Println("Server shut down.")
}

func setupRoutes(app *fiber.App) {
    app.Post("/startrecord", startRecordHandler)
    app.Post("/stoprecord", stopRecordHandler)
    app.Get("/list-devices", listDevicesHandler)
    app.Get("/list-pcap-files", listPcapFilesHandler)
    app.Get("/jsonpcap/:filename", handlePcapFile)
    app.Get("/jsonpcapcolumns/:filename", handlePcapColumns)
    app.Post("/pcap-rules", handlePcapRules)
    app.Get("/list-csv-files", listCsvFilesHandler)
}

func listDevicesHandler(c *fiber.Ctx) error {
    devices, err := pcap.FindAllDevs()
    if err != nil {
        fmt.Printf("Error finding devices: %v", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to list devices",
        })
    }

    // Convert the list of devices to a format that's easy to consume on the frontend
    type DeviceInfo struct {
        Name        string `json:"name"`
        Description string `json:"description"`
    }
    var deviceInfos []DeviceInfo
    for _, device := range devices {
        deviceInfos = append(deviceInfos, DeviceInfo{Name: device.Name, Description: device.Description})
    }

    return c.JSON(deviceInfos)
}

func listPcapFilesHandler(c *fiber.Ctx) error {
    return showStrictFiles(c,"pcap")
}

func listCsvFilesHandler(c *fiber.Ctx) error {
    return showStrictFiles(c,"csv")
}

func showStrictFiles(c *fiber.Ctx, whichFolder string) error{
    var filesInfo []map[string]string
    dir := "./front/build/" + whichFolder

    files, err := os.ReadDir(dir)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to read directory",
        })
    }

    for _, file := range files {
        if !file.IsDir() {
            fileInfo, _ := file.Info()
            filesInfo = append(filesInfo, map[string]string{
                "name":     file.Name(),
                "date":     fileInfo.ModTime().Format(time.RFC3339),
                "size":     fmt.Sprintf("%d", fileInfo.Size()),
                "download": fmt.Sprintf("/"+whichFolder+"/%s", file.Name()),
            })
        }
    }

    return c.JSON(filesInfo)
}


func handleWebSocket(c *websocket.Conn) {
    fmt.Println("Client connected")

    devices, err := pcap.FindAllDevs()
    if err != nil {
        fmt.Printf("Error finding devices: %v", err)
        c.Close()
        return
    }

    for _, device := range devices {
        fmt.Printf("Opening device: %s\n", device.Name)
        inactive, err := pcap.NewInactiveHandle(device.Name)
        if err != nil {
            fmt.Printf("Error creating inactive handle for %s: %v\n", device.Name, err)
            continue
        }
        defer inactive.CleanUp()

        err = inactive.SetSnapLen(1600)
        if err != nil {
            fmt.Printf("Error setting snap length for %s: %v\n", device.Name, err)
            continue
        }

        err = inactive.SetPromisc(true)
        if err != nil {
            fmt.Printf("Error setting promiscuous mode for %s: %v\n", device.Name, err)
            continue
        }

        err = inactive.SetTimeout(pcap.BlockForever)
        if err != nil {
            fmt.Printf("Error setting timeout for %s: %v\n", device.Name, err)
            continue
        }

        handle, err := inactive.Activate()
        if err != nil {
            fmt.Printf("Error activating handle for %s: %v\n", device.Name, err)
            continue
        }
        defer handle.Close()

        err = handle.SetBPFFilter("tcp")
        if err != nil {
            fmt.Printf("Error setting BPF filter on %s: %v\n", device.Name, err)
            continue
        }

        packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
        go processPackets(packetSource, device.Name, c)
    }
}

func processPackets(packetSource *gopacket.PacketSource, deviceName string, c *websocket.Conn) error {
    var totalBytes uint64
    portBytes := make(map[uint16]uint64) // Map to track bytes per port
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case packet, ok := <-packetSource.Packets():
            if !ok {
                return fmt.Errorf("packet source closed for device %s", deviceName)
            }
            tcpLayer := packet.Layer(layers.LayerTypeTCP)
            // Inside the case packet, ok := <-packetSource.Packets() block:
			if tcpLayer != nil {
				tcp, _ := tcpLayer.(*layers.TCP)
				payloadSize := uint64(len(tcp.Payload))
				totalBytes += payloadSize
				// Convert layers.TCPPort to uint16 before using as map keys
				srcPort := uint16(tcp.SrcPort)
				dstPort := uint16(tcp.DstPort)
				portBytes[srcPort] += payloadSize
				portBytes[dstPort] += payloadSize
			}

        case <-ticker.C:
            maxPortBytes := uint64(0) // Variable to track the maximum bytes observed on any port
            perPortBytesInfo := make([]PerPortTrafficInfo, 0, len(portBytes))

            // Iterate over portBytes to prepare per-port traffic information and find max traffic
            for port, bytes := range portBytes {
                perPortBytesInfo = append(perPortBytesInfo, PerPortTrafficInfo{Port: uint16(port), Bytes: bytes})
                if bytes > maxPortBytes {
                    maxPortBytes = bytes // Update maxPortBytes if current port has more traffic
                }
            }

            // Prepare the TrafficInfo struct with total, per-port, and max port traffic data
            trafficData := TrafficInfo{
                Device:       deviceName,
                Bytes:        totalBytes,
                PerPortBytes: perPortBytesInfo,
                MaxPortBytes: maxPortBytes, // Include the maximum port traffic observed in this interval
                Timestamp:    time.Now().Format("2006-01-02 15:04:05"),
            }

            fmt.Printf("Sending traffic data: %+v\n", trafficData)
            err := c.WriteJSON(trafficData)
            if err != nil {
                fmt.Println("Error sending traffic data:", err)
                return err
            }

            // Reset counters for the next interval
            totalBytes = 0
            portBytes = make(map[uint16]uint64)
        }
    }
}

func captureTraffic(app *fiber.App) {
    devices, err := pcap.FindAllDevs()
    if err != nil {
        fmt.Printf("Error finding devices: %v", err)
        return
    }

    for _, device := range devices {
        fmt.Printf("Opening device: %s\n", device.Name)
        inactive, err := pcap.NewInactiveHandle(device.Name)
        if err != nil {
            fmt.Printf("Error creating inactive handle for %s: %v\n", device.Name, err)
            continue
        }
        defer inactive.CleanUp()

        err = inactive.SetSnapLen(1600)
        if err != nil {
            fmt.Printf("Error setting snap length for %s: %v\n", device.Name, err)
            continue
        }

        err = inactive.SetPromisc(true)
        if err != nil {
            fmt.Printf("Error setting promiscuous mode for %s: %v\n", device.Name, err)
            continue
        }

        err = inactive.SetTimeout(pcap.BlockForever)
        if err != nil {
            fmt.Printf("Error setting timeout for %s: %v\n", device.Name, err)
            continue
        }

        handle, err := inactive.Activate()
        if err != nil {
            fmt.Printf("Error activating handle for %s: %v\n", device.Name, err)
            continue
        }
        defer handle.Close()

        err = handle.SetBPFFilter("tcp")
        if err != nil {
            fmt.Printf("Error setting BPF filter on %s: %v\n", device.Name, err)
            continue
        }

        packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
        app.Get("/ws/"+device.Name, websocket.New(func(c *websocket.Conn) {
            processPackets(packetSource, device.Name, c)
        }))
    }
}
