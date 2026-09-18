using System;

namespace CloudGuard.Api.Models;

public class ServerAsset
{
    // High-Level Core Schema
    public Guid Id { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string OperatingSystem { get; set; } = string.Empty;
    public int MissingPatches { get; set; }
    public string SecurityStatus { get; set; } = string.Empty;
    public DateTime LastAuditedAt { get; set; }
    public string BuildingName { get; set; } = string.Empty;
    public string ServerRoom { get; set; } = string.Empty;

    // 🏎️ CORE HARDWARE INFRASTRUCTURE ALLOCATIONS
    public int CpuCoreCount { get; set; }
    public int InstalledRamGb { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string MacAddress { get; set; } = string.Empty;

    // 📈 LIVE TELEMETRY PERIMETERS
    public long UptimeSeconds { get; set; }
    public double FreeRamGb { get; set; }

    // ⏳ HARDWARE LIFECYCLE DEGRADATION (AGE IN MONTHS)
    public int CpuAgeMonths { get; set; }
    public int RamAgeMonths { get; set; }
    public int DiskAgeMonths { get; set; }

    // 📊 PROGRAMMATIC TIME-SERIES LOAD PERCENTAGES
    public double AvgCpuLoad24H { get; set; }
    public double AvgCpuLoad1W { get; set; }
    public double AvgCpuLoad1M { get; set; }

    public double AvgRamLoad24H { get; set; }
    public double AvgRamLoad1W { get; set; }
    public double AvgRamLoad1M { get; set; }

    // 🛡️ SECURITY AUDIT SHELL LOGS (Stored as simple comma/newline separated telemetry text blocks)
    public string LastShellCommands { get; set; } = string.Empty;
}
