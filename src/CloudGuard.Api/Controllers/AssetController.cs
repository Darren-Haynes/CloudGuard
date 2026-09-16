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
}
