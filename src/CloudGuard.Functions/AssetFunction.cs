using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CloudGuard.Api.Controllers;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace CloudGuard.Functions;

public class AssetFunction(IAssetService assetService, IAuditLogService auditLogService)
{
    // The lookup and export routes delegate to the API controller, so a response from
    // the Functions app is identical to one from the local API (same CSV layout, report
    // text, file names and 404 bodies). The controller is stateless, so a fresh instance
    // per call is fine.
    private AssetController Controller => new(assetService, auditLogService);

    [Function("GetAssetsFunction")]
    public async Task<IActionResult> GetAssets(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset")] HttpRequest req)
    {
        var assets = await assetService.GetAllAssetsAsync();
        return new OkObjectResult(assets);
    }

    [Function("GetAssetByIdFunction")]
    public async Task<IActionResult> GetAssetById(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset/{id:guid}")] HttpRequest req,
        Guid id)
    {
        var result = await Controller.GetAssetById(id);

        // ActionResult<T> carries either an explicit result (such as the 404) or a bare value.
        return result.Result ?? new OkObjectResult(result.Value);
    }

    [Function("ExportAuditCsvFunction")]
    public Task<IActionResult> ExportAuditCsv(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset/export")] HttpRequest req)
    {
        return Controller.ExportAuditCsv(QueryValue(req, "building"), QueryValue(req, "room"));
    }

    [Function("ExportAssetTextReportFunction")]
    public Task<IActionResult> ExportAssetTextReport(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "asset/{id:guid}/export/text")] HttpRequest req,
        Guid id)
    {
        return Controller.ExportAssetTextReport(id);
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

    // An absent or empty query value means "no scope", as with the API's model binding.
    private static string? QueryValue(HttpRequest req, string key)
    {
        var value = req.Query[key].FirstOrDefault();
        return string.IsNullOrEmpty(value) ? null : value;
    }
}
