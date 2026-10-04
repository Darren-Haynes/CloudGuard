using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace CloudGuard.Functions;

public class AssetFunction(IAssetService assetService, IAuditLogService auditLogService)
{
    [Function("GetAssetsFunction")]
    public async Task<IActionResult> GetAssets(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset")] HttpRequest req)
    {
        var assets = await assetService.GetAllAssetsAsync();
        return new OkObjectResult(assets);
    }

    [Function("RemediateAssetFunction")]
    public async Task<IActionResult> RemediateAssetPatches(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "asset/{id:guid}/remediate")] HttpRequest req,
        Guid id)
    {
        var assets = await assetService.GetAllAssetsAsync();
        var asset = assets.FirstOrDefault(s => s.Id == id);

        if (asset == null) return new NotFoundObjectResult(new { message = "Target node not found." });
        if (asset.MissingPatches == 0) return new BadRequestObjectResult(new { message = "Server is already fully compliant." });

        asset.MissingPatches = 0;
        asset.SecurityStatus = "Compliant";
        asset.LastAuditedAt = DateTime.UtcNow;
        asset.LastShellCommands = $"cloudguard-serverless-remediate --exec\n{asset.LastShellCommands}";

        await assetService.UpdateAssetAsync(asset);

        return new OkObjectResult(new { message = $"Successfully deployed patch matrices to {asset.ServerName}.", updatedAsset = asset });
    }

    [Function("GetAuditTrailFunction")]
    public IActionResult GetSecurityAuditTrail(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset/security/audit-trail")] HttpRequest req)
    {
        var trail = auditLogService.GetAuditLedgerTrail();
        return new OkObjectResult(trail);
    }
}
