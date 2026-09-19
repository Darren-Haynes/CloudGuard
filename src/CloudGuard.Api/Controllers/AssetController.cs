using System.Text;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CloudGuard.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetController(IAssetService assetService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServerAsset>>> GetAssets()
    {
        var assets = await assetService.GetAllAssetsAsync();
        return Ok(assets);
    }

    // 👇 DYNAMIC CSV EXPORT STEAMING ROUTE
    [HttpGet("export")]
    public async Task<IActionResult> ExportAuditCsv([FromQuery] string? building, [FromQuery] string? room)
    {
        var scopedAssets = await assetService.GetScopedAssetsAsync(building, room);

        var csvBuilder = new StringBuilder();

        // 1. Compile Comma-Separated Headers
        csvBuilder.AppendLine("Server Name,Operating System,Missing Patches,Security Status,Building,Server Room,Last Audited");

        // 2. Iterate Entities into Escape-Safe CSV Data Lines
        foreach (var asset in scopedAssets)
        {
            csvBuilder.AppendLine(
                $"\"{asset.ServerName}\"," +
                $"\"{asset.OperatingSystem}\"," +
                $"{asset.MissingPatches}," +
                $"\"{asset.SecurityStatus}\"," +
                $"\"{asset.BuildingName}\"," +
                $"\"{asset.ServerRoom}\"," +
                $"\"{asset.LastAuditedAt:yyyy-MM-dd HH:mm:ss}\""
            );
        }

        // 3. Encode the text memory block stream directly into a byte buffer array
        var csvBytes = Encoding.UTF8.GetBytes(csvBuilder.ToString());

        var cleanFileName = string.IsNullOrWhiteSpace(building)
            ? "cloudguard_fleet_audit.csv"
            : $"cloudguard_{building.Replace(" ", "").ToLower()}_{room?.Replace(" ", "").ToLower() ?? "all"}_audit.csv";

        // 4. Return an explicit binary octet-stream file download handle back over the wire
        return File(csvBytes, "text/csv", cleanFileName);
    }

    // 👇 CASE-INSENSITIVE DEEP DIVE RETRIEVAL CHANNEL
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServerAsset>> GetAssetById(Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();

        // Match GUID values explicitly to bypass network string serialization mismatches
        var selectedAsset = assets.FirstOrDefault(s => s.Id == id);

        if (selectedAsset == null)
        {
            return NotFound(new { message = $"Server node with ID {id} was not tracked in our active perimeters." });
        }

        return Ok(selectedAsset);
    }

    // 👇 SINGLE-SERVER PLAIN TEXT SYSTEM INTEGRITY REPORT EXPORTER
    [HttpGet("{id:guid}/export/text")]
    public async Task<IActionResult> ExportAssetTextReport(Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();

        // Isolate the single server asset from the resilient database tier using the path GUID
        var asset = assets.FirstOrDefault(s => s.Id == id);

        if (asset == null)
        {
            return NotFound(new { message = $"Server node with ID {id} was not tracked in our active perimeters." });
        }

        var reportBuilder = new StringBuilder();

        // 1. Header Block
        reportBuilder.AppendLine("====================================================");
        reportBuilder.AppendLine(" CLOUDGUARD ENTERPRISE SECURE SYSTEM INTEGRITY REPORT");
        reportBuilder.AppendLine("====================================================");
        reportBuilder.AppendLine($"Server Name       : {asset.ServerName}");
        reportBuilder.AppendLine($"Operating System  : {asset.OperatingSystem}");
        reportBuilder.AppendLine($"Building / Room   : {asset.BuildingName} / {asset.ServerRoom}");
        reportBuilder.AppendLine($"Last Audited At   : {asset.LastAuditedAt:yyyy-MM-dd HH:mm:ss} UTC");
        reportBuilder.AppendLine($"Security Status   : {asset.SecurityStatus}");
        reportBuilder.AppendLine($"Missing Patches   : {asset.MissingPatches}");
        reportBuilder.AppendLine("----------------------------------------------------");

        // 2. Hardware Specifications
        reportBuilder.AppendLine("HARDWARE SPECIFICATIONS");
        reportBuilder.AppendLine($"  CPU Cores       : {asset.CpuCoreCount}");
        reportBuilder.AppendLine($"  Installed RAM   : {asset.InstalledRamGb} GB");
        reportBuilder.AppendLine($"  Free RAM        : {asset.FreeRamGb} GB");
        reportBuilder.AppendLine($"  IP Address      : {asset.IpAddress}");
        reportBuilder.AppendLine($"  MAC Address     : {asset.MacAddress}");
        reportBuilder.AppendLine($"  CPU Age         : {asset.CpuAgeMonths} months");
        reportBuilder.AppendLine($"  RAM Age         : {asset.RamAgeMonths} months");
        reportBuilder.AppendLine($"  Disk Age        : {asset.DiskAgeMonths} months");
        reportBuilder.AppendLine("----------------------------------------------------");

        // 3. Uptime & Load Telemetry
        reportBuilder.AppendLine("UPTIME & LOAD TELEMETRY");
        reportBuilder.AppendLine($"  Uptime (seconds): {asset.UptimeSeconds}");
        reportBuilder.AppendLine($"  Avg CPU Load 24H: {asset.AvgCpuLoad24H}%");
        reportBuilder.AppendLine($"  Avg CPU Load 1W : {asset.AvgCpuLoad1W}%");
        reportBuilder.AppendLine($"  Avg CPU Load 1M : {asset.AvgCpuLoad1M}%");
        reportBuilder.AppendLine($"  Avg RAM Load 24H: {asset.AvgRamLoad24H}%");
        reportBuilder.AppendLine($"  Avg RAM Load 1W : {asset.AvgRamLoad1W}%");
        reportBuilder.AppendLine($"  Avg RAM Load 1M : {asset.AvgRamLoad1M}%");
        reportBuilder.AppendLine("----------------------------------------------------");

        // 4. Last 5 Shell Commands Breakdown
        reportBuilder.AppendLine("LAST 5 SHELL COMMANDS EXECUTED");
        var shellCommands = asset.LastShellCommands.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        for (int i = 0; i < shellCommands.Length; i++)
        {
            reportBuilder.AppendLine($"  [{i + 1}] {shellCommands[i]}");
        }
        reportBuilder.AppendLine("====================================================");

        // 5. Encode the string memory block into a UTF-8 byte array
        var reportBytes = Encoding.UTF8.GetBytes(reportBuilder.ToString());

        var cleanFileName = $"cloudguard_audit_{asset.ServerName}.txt";

        // 6. Return an explicit binary attachment file handle back over the wire
        return File(reportBytes, "text/plain", cleanFileName);
    }
}
