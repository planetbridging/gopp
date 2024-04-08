package main


import (
    "os"
    "sync"
	"fmt"
    "github.com/google/gopacket"
    "github.com/google/gopacket/pcap"
    "github.com/google/gopacket/pcapgo"
	"github.com/gofiber/fiber/v2"
)

var (
    // Packet capture handle
    globalHandle *pcap.Handle

    // Channel to signal stopping the capture
    globalStopChan chan struct{}

    // Ensure that start and stop operations are thread-safe
    captureMutex sync.Mutex

    // File writer for pcap
    globalPcapWriter *pcapgo.Writer
)

type StartRecordRequest struct {
    Device   string `json:"device"`
    Filename string `json:"filename"`
    Filter   string `json:"filter"`
}

func startRecordHandler(c *fiber.Ctx) error {
    var request StartRecordRequest
    if err := c.BodyParser(&request); err != nil {
        fmt.Printf("Error parsing request: %v\n", err)
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Cannot parse request",
        })
    }

    err := startCapture(request.Device, request.Filename, request.Filter)
    if err != nil {
        fmt.Printf("Error starting capture: %v\n", err)
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to start recording",
        })
    }

    return c.SendStatus(fiber.StatusOK)
}


func stopRecordHandler(c *fiber.Ctx) error {
    // Simply call the stopCapture function
    stopCapture()

    return c.SendStatus(fiber.StatusOK)
}

func startCapture(device string, filename string, filter string) error {
    captureMutex.Lock()
    defer captureMutex.Unlock()

    if globalHandle != nil {
        return fmt.Errorf("capture already in progress")
    }

    handle, err := pcap.OpenLive(device, 1600, true, pcap.BlockForever)
    if err != nil {
        return err
    }

    if err := handle.SetBPFFilter(filter); err != nil {
        handle.Close()
        return err
    }

    // Ensure the directory exists before creating the file
    dir := "./front/build/pcap" // Define the directory where pcap files should be stored
    if err := os.MkdirAll(dir, 0755); err != nil { // 0755 permissions allow the owner to read/write/execute, and others to read/execute
        handle.Close()
        return fmt.Errorf("failed to create directory for pcap files: %w", err)
    }

    fullPath := fmt.Sprintf("%s/%s", dir, filename) // Construct the full file path
    f, err := os.Create(fullPath)
    if err != nil {
        handle.Close()
        return err
    }

    globalPcapWriter = pcapgo.NewWriter(f)
    if err := globalPcapWriter.WriteFileHeader(65536, handle.LinkType()); err != nil {
        f.Close()
        handle.Close()
        return err
    }

    globalHandle = handle
    globalStopChan = make(chan struct{})

    go func() {
        defer f.Close()
        defer handle.Close()
        packetSource := gopacket.NewPacketSource(globalHandle, globalHandle.LinkType())
        for {
            select {
            case packet := <-packetSource.Packets():
                globalPcapWriter.WritePacket(packet.Metadata().CaptureInfo, packet.Data())
            case <-globalStopChan:
                return
            }
        }
    }()
    return nil
}



func stopCapture() {
    captureMutex.Lock()
    defer captureMutex.Unlock()

    if globalHandle == nil {
        fmt.Println("No capture in progress to stop")
        return
    }

    close(globalStopChan)
    globalHandle = nil
    globalPcapWriter = nil
}
