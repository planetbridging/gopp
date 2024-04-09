package main


import (
    "os"
    "sync"
	"fmt"
	"strconv"
    "github.com/google/gopacket"
    "github.com/google/gopacket/pcap"
    "github.com/google/gopacket/pcapgo"
	"github.com/gofiber/fiber/v2"
	"github.com/google/gopacket/layers"
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

	dir := "./front/build/pcap"
    ensureDirExists(dir)

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


// ensureDirExists checks if a directory exists at the given path, and if not, creates it.
func ensureDirExists(dirPath string) error {
	// Check if the directory already exists
	if _, err := os.Stat(dirPath); os.IsNotExist(err) {
		// Directory does not exist, attempt to create it
		err := os.MkdirAll(dirPath, 0755) // 0755 permissions: read/write/execute for owner, read/execute for group and others
		if err != nil {
			// Failed to create directory, return the error
			return fmt.Errorf("failed to create directory '%s': %w", dirPath, err)
		}
	}
	// Directory exists or was successfully created, return nil error
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


func handlePcapFile(c *fiber.Ctx) error {

	page := c.Query("page", "1")
	//fmt.Println(page)

	pageNum, err := strconv.Atoi(page)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid limit parameter"})
    }

    filename := c.Params("filename")
    packets, err := readPcapFile(fmt.Sprintf("./front/build/pcap/%s", filename),pageNum)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    return c.JSON(packets)
}

func readPcapFile(filename string, pageNum int) ([]map[string]interface{}, error) {
    
	//fmt.Println(pageNum);
	
	pcapFile, err := pcap.OpenOffline(filename)
    if err != nil {
        return nil, fmt.Errorf("failed to open pcap file: %v", err)
    }
    defer pcapFile.Close()

    packetSource := gopacket.NewPacketSource(pcapFile, pcapFile.LinkType())
    packets := make([]map[string]interface{}, 0)

	limit := 500

	startIndex := (pageNum - 1) * limit
    endIndex := startIndex + limit
	currentIndex := 0

    for packet := range packetSource.Packets() {

		if currentIndex >= startIndex && currentIndex < endIndex {

			packetInfo := make(map[string]interface{})

			// Metadata
			packetInfo["timestamp"] = packet.Metadata().Timestamp
			packetInfo["length"] = packet.Metadata().CaptureInfo.Length

			// Ethernet layer
			if ethernetLayer := packet.Layer(layers.LayerTypeEthernet); ethernetLayer != nil {
				ethernet, _ := ethernetLayer.(*layers.Ethernet)
				packetInfo["ethernet_source"] = ethernet.SrcMAC.String()
				packetInfo["ethernet_destination"] = ethernet.DstMAC.String()
				packetInfo["ethernet_type"] = ethernet.EthernetType.String()
			}

			// IP layer
			if ipLayer := packet.Layer(layers.LayerTypeIPv4); ipLayer != nil {
				ip, _ := ipLayer.(*layers.IPv4)
				packetInfo["ip_version"] = ip.Version
				packetInfo["ip_ihl"] = ip.IHL
				packetInfo["ip_tos"] = ip.TOS
				packetInfo["ip_length"] = ip.Length
				packetInfo["ip_id"] = ip.Id
				packetInfo["ip_flags"] = ip.Flags
				packetInfo["ip_fragment_offset"] = ip.FragOffset
				packetInfo["ip_ttl"] = ip.TTL
				packetInfo["ip_protocol"] = ip.Protocol
				packetInfo["ip_checksum"] = ip.Checksum
				packetInfo["ip_source"] = ip.SrcIP.String()
				packetInfo["ip_destination"] = ip.DstIP.String()
				packetInfo["ip_options"] = ip.Options
			}

			// TCP layer

			if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
				tcp, _ := tcpLayer.(*layers.TCP)
				packetInfo["tcp_source_port"] = tcp.SrcPort
				packetInfo["tcp_destination_port"] = tcp.DstPort
				packetInfo["tcp_sequence"] = tcp.Seq
				packetInfo["tcp_acknowledgment"] = tcp.Ack
				packetInfo["tcp_data_offset"] = tcp.DataOffset
				packetInfo["tcp_flags_ns"] = tcp.NS
				packetInfo["tcp_flags_cwr"] = tcp.CWR
				packetInfo["tcp_flags_ece"] = tcp.ECE
				packetInfo["tcp_flags_urg"] = tcp.URG
				packetInfo["tcp_flags_ack"] = tcp.ACK
				packetInfo["tcp_flags_psh"] = tcp.PSH
				packetInfo["tcp_flags_rst"] = tcp.RST
				packetInfo["tcp_flags_syn"] = tcp.SYN
				packetInfo["tcp_flags_fin"] = tcp.FIN
				packetInfo["tcp_window"] = tcp.Window
				packetInfo["tcp_checksum"] = tcp.Checksum
				packetInfo["tcp_urgent_pointer"] = tcp.Urgent
				packetInfo["tcp_options"] = tcp.Options
			}

			// UDP layer
			if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
				udp, _ := udpLayer.(*layers.UDP)
				packetInfo["udp_source_port"] = udp.SrcPort
				packetInfo["udp_destination_port"] = udp.DstPort
				packetInfo["udp_length"] = udp.Length
				packetInfo["udp_checksum"] = udp.Checksum
			}

			// Raw payload
			if appLayer := packet.ApplicationLayer(); appLayer != nil {
				packetInfo["payload"] = string(appLayer.Payload())
				//packetInfo["payload"] = ""
			}


			

			packets = append(packets, packetInfo)

			
		}
		currentIndex++
        if currentIndex >= endIndex {
            break
        }
    }

    return packets, nil
}


func handlePcapColumns(c *fiber.Ctx) error {
    filename := c.Params("filename")
    columns, err := getUniquePcapColumns(fmt.Sprintf("./front/build/pcap/%s", filename))
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    response := fiber.Map{
        "columns": columns,
    }

    return c.JSON(response)
}

func getUniquePcapColumns(filename string) ([]string, error) {
    pcapFile, err := pcap.OpenOffline(filename)
    if err != nil {
        return nil, fmt.Errorf("failed to open pcap file: %v", err)
    }
    defer pcapFile.Close()

    packetSource := gopacket.NewPacketSource(pcapFile, pcapFile.LinkType())
    uniqueColumns := make(map[string]bool)

    for packet := range packetSource.Packets() {


        packetInfo := make(map[string]interface{})

        // Metadata
        packetInfo["timestamp"] = packet.Metadata().Timestamp
        packetInfo["length"] = packet.Metadata().CaptureInfo.Length

        // Ethernet layer
        if ethernetLayer := packet.Layer(layers.LayerTypeEthernet); ethernetLayer != nil {
            ethernet, _ := ethernetLayer.(*layers.Ethernet)
            packetInfo["ethernet_source"] = ethernet.SrcMAC.String()
            packetInfo["ethernet_destination"] = ethernet.DstMAC.String()
            packetInfo["ethernet_type"] = ethernet.EthernetType.String()
        }

        // IP layer
        if ipLayer := packet.Layer(layers.LayerTypeIPv4); ipLayer != nil {
            ip, _ := ipLayer.(*layers.IPv4)
            packetInfo["ip_version"] = ip.Version
            packetInfo["ip_ihl"] = ip.IHL
            packetInfo["ip_tos"] = ip.TOS
            packetInfo["ip_length"] = ip.Length
            packetInfo["ip_id"] = ip.Id
            packetInfo["ip_flags"] = ip.Flags
            packetInfo["ip_fragment_offset"] = ip.FragOffset
            packetInfo["ip_ttl"] = ip.TTL
            packetInfo["ip_protocol"] = ip.Protocol
            packetInfo["ip_checksum"] = ip.Checksum
            packetInfo["ip_source"] = ip.SrcIP.String()
            packetInfo["ip_destination"] = ip.DstIP.String()
            packetInfo["ip_options"] = ip.Options
        }

        // TCP layer
        if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
            tcp, _ := tcpLayer.(*layers.TCP)
            packetInfo["tcp_source_port"] = tcp.SrcPort
            packetInfo["tcp_destination_port"] = tcp.DstPort
            packetInfo["tcp_sequence"] = tcp.Seq
            packetInfo["tcp_acknowledgment"] = tcp.Ack
            packetInfo["tcp_data_offset"] = tcp.DataOffset
            packetInfo["tcp_flags_ns"] = tcp.NS
            packetInfo["tcp_flags_cwr"] = tcp.CWR
            packetInfo["tcp_flags_ece"] = tcp.ECE
            packetInfo["tcp_flags_urg"] = tcp.URG
            packetInfo["tcp_flags_ack"] = tcp.ACK
            packetInfo["tcp_flags_psh"] = tcp.PSH
            packetInfo["tcp_flags_rst"] = tcp.RST
            packetInfo["tcp_flags_syn"] = tcp.SYN
            packetInfo["tcp_flags_fin"] = tcp.FIN
            packetInfo["tcp_window"] = tcp.Window
            packetInfo["tcp_checksum"] = tcp.Checksum
            packetInfo["tcp_urgent_pointer"] = tcp.Urgent
            packetInfo["tcp_options"] = tcp.Options
        }

        // UDP layer
        if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
            udp, _ := udpLayer.(*layers.UDP)
            packetInfo["udp_source_port"] = udp.SrcPort
            packetInfo["udp_destination_port"] = udp.DstPort
            packetInfo["udp_length"] = udp.Length
            packetInfo["udp_checksum"] = udp.Checksum
        }

        // Raw payload
        if appLayer := packet.ApplicationLayer(); appLayer != nil {
            packetInfo["payload"] = string(appLayer.Payload())
        }

        // Update the uniqueColumns map with the keys from packetInfo
        for key := range packetInfo {
            uniqueColumns[key] = true
        }
    }

    // Convert the uniqueColumns map keys to a slice
    columns := make([]string, 0, len(uniqueColumns))
    for column := range uniqueColumns {
        columns = append(columns, column)
    }

    return columns, nil
}


func ChunkshandlePcapFile(c *fiber.Ctx) error {
    filename := c.Params("filename")
    page := c.Query("page", "1")
    limit := c.Query("limit", "2000")

    pageInt, err := strconv.Atoi(page)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid page parameter"})
    }

    limitInt, err := strconv.Atoi(limit)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid limit parameter"})
    }

    packets, err := readPcapFileChunked(fmt.Sprintf("./front/build/pcap/%s", filename), pageInt, limitInt)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
    }

    response := fiber.Map{
        "packets": packets,
    }

    return c.JSON(response)
}

func readPcapFileChunked(filename string, page, limit int) ([]map[string]interface{}, error) {
    pcapFile, err := pcap.OpenOffline(filename)
    if err != nil {
        return nil, fmt.Errorf("failed to open pcap file: %v", err)
    }
    defer pcapFile.Close()

    packetSource := gopacket.NewPacketSource(pcapFile, pcapFile.LinkType())
    packets := make([]map[string]interface{}, 0)

    startIndex := (page - 1) * limit
    endIndex := startIndex + limit

    currentIndex := 0
    for packet := range packetSource.Packets() {
        if currentIndex >= startIndex && currentIndex < endIndex {
            packetInfo := make(map[string]interface{})

            // Metadata
            packetInfo["timestamp"] = packet.Metadata().Timestamp
            packetInfo["length"] = packet.Metadata().CaptureInfo.Length

            // Ethernet layer
            if ethernetLayer := packet.Layer(layers.LayerTypeEthernet); ethernetLayer != nil {
                ethernet, _ := ethernetLayer.(*layers.Ethernet)
                packetInfo["ethernet_source"] = ethernet.SrcMAC.String()
                packetInfo["ethernet_destination"] = ethernet.DstMAC.String()
                packetInfo["ethernet_type"] = ethernet.EthernetType.String()
            }

            // IP layer
            if ipLayer := packet.Layer(layers.LayerTypeIPv4); ipLayer != nil {
                ip, _ := ipLayer.(*layers.IPv4)
                packetInfo["ip_version"] = ip.Version
                packetInfo["ip_ihl"] = ip.IHL
                packetInfo["ip_tos"] = ip.TOS
                packetInfo["ip_length"] = ip.Length
                packetInfo["ip_id"] = ip.Id
                packetInfo["ip_flags"] = ip.Flags
                packetInfo["ip_fragment_offset"] = ip.FragOffset
                packetInfo["ip_ttl"] = ip.TTL
                packetInfo["ip_protocol"] = ip.Protocol
                packetInfo["ip_checksum"] = ip.Checksum
                packetInfo["ip_source"] = ip.SrcIP.String()
                packetInfo["ip_destination"] = ip.DstIP.String()
                packetInfo["ip_options"] = ip.Options
            }

            // TCP layer
            if tcpLayer := packet.Layer(layers.LayerTypeTCP); tcpLayer != nil {
                tcp, _ := tcpLayer.(*layers.TCP)
                packetInfo["tcp_source_port"] = tcp.SrcPort
                packetInfo["tcp_destination_port"] = tcp.DstPort
                packetInfo["tcp_sequence"] = tcp.Seq
                packetInfo["tcp_acknowledgment"] = tcp.Ack
                packetInfo["tcp_data_offset"] = tcp.DataOffset
                packetInfo["tcp_flags_ns"] = tcp.NS
                packetInfo["tcp_flags_cwr"] = tcp.CWR
                packetInfo["tcp_flags_ece"] = tcp.ECE
                packetInfo["tcp_flags_urg"] = tcp.URG
                packetInfo["tcp_flags_ack"] = tcp.ACK
                packetInfo["tcp_flags_psh"] = tcp.PSH
                packetInfo["tcp_flags_rst"] = tcp.RST
                packetInfo["tcp_flags_syn"] = tcp.SYN
                packetInfo["tcp_flags_fin"] = tcp.FIN
                packetInfo["tcp_window"] = tcp.Window
                packetInfo["tcp_checksum"] = tcp.Checksum
                packetInfo["tcp_urgent_pointer"] = tcp.Urgent
                packetInfo["tcp_options"] = tcp.Options
            }

            // UDP layer
            if udpLayer := packet.Layer(layers.LayerTypeUDP); udpLayer != nil {
                udp, _ := udpLayer.(*layers.UDP)
                packetInfo["udp_source_port"] = udp.SrcPort
                packetInfo["udp_destination_port"] = udp.DstPort
                packetInfo["udp_length"] = udp.Length
                packetInfo["udp_checksum"] = udp.Checksum
            }

            // Raw payload
            if appLayer := packet.ApplicationLayer(); appLayer != nil {
                packetInfo["payload"] = string(appLayer.Payload())
            }

            packets = append(packets, packetInfo)
        }
        currentIndex++
        if currentIndex >= endIndex {
            break
        }
    }

    return packets, nil
}