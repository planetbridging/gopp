package main

import (
    //"fmt"
    "strconv"
    "strings"
)

func transformString(str string) string {
    var sb strings.Builder
    for _, char := range str {
        sb.WriteString(strconv.Itoa(int(char)))
        sb.WriteString(" ")
    }
    return strings.TrimSpace(sb.String())
}