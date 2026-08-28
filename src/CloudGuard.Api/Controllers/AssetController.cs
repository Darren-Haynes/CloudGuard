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
}
