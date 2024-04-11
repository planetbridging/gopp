package main

import (
    "fmt"
    "strconv"
    "strings"
    "bytes"
    "io/ioutil"
    "net/http"
    "github.com/gofiber/fiber/v2"
)

func transformString(str string) string {
    var sb strings.Builder
    for _, char := range str {
        sb.WriteString(strconv.Itoa(int(char)))
        sb.WriteString(" ")
    }
    return strings.TrimSpace(sb.String())
}

func setupProxyRoute(app *fiber.App) {
    app.Post("/predict", func(c *fiber.Ctx) error {
        requestBody := c.Body()

        req, err := http.NewRequest("POST", "http://localhost:8030/predict", bytes.NewReader(requestBody))
        if err != nil {
            fmt.Println("NewRequest Error:", err)
            return c.Status(http.StatusInternalServerError).SendString(err.Error())
        }

        // Forwarding headers is crucial, especially Content-Type
        originalHeaders := c.GetReqHeaders()
        for key, values := range originalHeaders {
            for _, value := range values {
                req.Header.Add(key, value)
            }
        }

        client := &http.Client{}
        resp, err := client.Do(req)
        if err != nil {
            fmt.Println("Client.Do Error:", err)
            return c.Status(http.StatusInternalServerError).SendString(err.Error())
        }
        defer resp.Body.Close()

        respBody, err := ioutil.ReadAll(resp.Body)
        if err != nil {
            fmt.Println("ReadAll Error:", err)
            return c.Status(http.StatusInternalServerError).SendString(err.Error())
        }

        // For debugging
        //fmt.Println("Response from Express:", string(respBody))

        return c.Status(resp.StatusCode).Send(respBody)
    })
}

