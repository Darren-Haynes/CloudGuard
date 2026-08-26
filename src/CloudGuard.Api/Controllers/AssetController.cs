using CloudGuard.Api.Data;
using CloudGuard.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudGuard.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ServerAsset>>> GetAssets()
    {
        var assets = await context.ServerAssets.ToListAsync();
        return Ok(assets);
    }
}
