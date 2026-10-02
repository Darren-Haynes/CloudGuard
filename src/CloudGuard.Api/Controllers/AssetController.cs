using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CloudGuard.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetController(IAssetService assetService, IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServerAsset>>> GetAssets()
    {
        var assets = await assetService.GetAllAssetsAsync();
        return Ok(assets);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServerAsset>> GetAssetById(Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();
        var asset = assets.FirstOrDefault(s => s.Id == id);
        if (asset == null)
        {
            return NotFound(new { message = "Requested hardware perimeter node could not be located." });
        }
        return Ok(asset);
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportAuditCsv([FromQuery] string? building, [FromQuery] string? room)
    {
        var assets = await assetService.GetScopedAssetsAsync(building, room);

        var sb = new StringBuilder();
        sb.AppendLine("Server Name,Operating System,Missing Patches,Security Status");

        foreach (var asset in assets)
        {
            sb.AppendLine($"{asset.ServerName},{asset.OperatingSystem},{asset.MissingPatches},{asset.SecurityStatus}");
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", $"cloudguard_{building?.ToLower() ?? "all"}_{room?.ToLower() ?? "all"}_audit.csv");
    }

    [HttpGet("{id:guid}/export/text")]
    public async Task<IActionResult> ExportAssetTextReport(Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();
        var asset = assets.FirstOrDefault(s => s.Id == id);

        if (asset == null) return NotFound(new { message = "Requested asset node could not be located." });

        var sb = new StringBuilder();
        sb.AppendLine("=========================================");
        sb.AppendLine($"CLOUDGUARD TEXT REPORT: {asset.ServerName.ToUpper()}");
        sb.AppendLine("=========================================");
        sb.AppendLine($"Cores: {asset.CpuCoreCount} | RAM: {asset.InstalledRamGb}GB");
        sb.AppendLine($"IP: {asset.IpAddress} | MAC: {asset.MacAddress}");
        sb.AppendLine($"Uptime Seconds: {asset.UptimeSeconds}");
        sb.AppendLine($"CPU Age: {asset.CpuAgeMonths}m | RAM Age: {asset.RamAgeMonths}m | Disk Age: {asset.DiskAgeMonths}m");
        sb.AppendLine($"Commands: {asset.LastShellCommands}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/plain", $"cloudguard_audit_{asset.ServerName.ToLower()}.txt");
    }

    [HttpPost("{id:guid}/remediate")]
    public async Task<IActionResult> RemediateAssetPatches(Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();
        var asset = assets.FirstOrDefault(s => s.Id == id);

        if (asset == null) return NotFound(new { message = "Target node not found." });
        if (asset.MissingPatches == 0) return BadRequest(new { message = "Server is already fully compliant." });

        asset.MissingPatches = 0;
        asset.SecurityStatus = "Compliant";
        asset.LastAuditedAt = DateTime.UtcNow;
        asset.LastShellCommands = $"cloudguard-remediate --exec\n{asset.LastShellCommands}";

        await assetService.UpdateAssetAsync(asset);

        return Ok(new { message = $"Successfully deployed patch matrices to {asset.ServerName}.", updatedAsset = asset });
    }

    [HttpGet("security/audit-trail")]
    public async Task<IActionResult> GetSecurityAuditTrail()
    {
        var trail = auditLogService.GetAuditLedgerTrail();
        return Ok(trail);
    }
}
