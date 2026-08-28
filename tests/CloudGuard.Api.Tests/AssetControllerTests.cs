using CloudGuard.Api.Controllers;
using CloudGuard.Api.Models;
using CloudGuard.Api.Services;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using Xunit;

namespace CloudGuard.Api.Tests;

public class AssetControllerTests
{
    [Fact]
    public async Task GetAssets_ReturnsOkResult_WithListOfAssets()
    {
        // 1. Arrange: Formulate a clean mock contract using NSubstitute
        var assetServiceMock = Substitute.For<IAssetService>();

        // Define clean, strictly mapped test rows mirroring our real models
        var sampleAssets = new List<ServerAsset>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ServerName = "test-server-01",
                OperatingSystem = "Ubuntu",
                MissingPatches = 2,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow
            },
            new()
            {
                Id = Guid.NewGuid(),
                ServerName = "test-server-02",
                OperatingSystem = "Windows",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow
            }
        };

        // Instruct the mock to return this sample collection when invoked asynchronously
        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(sampleAssets));

        // 2. Act: Inject the mock contract straight into the controller constructor
        var controller = new AssetController(assetServiceMock);
        var result = await controller.GetAssets();

        // 3. Assert: Verify the server HTTP result wrapper holds our mock records
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var assets = Assert.IsAssignableFrom<IEnumerable<ServerAsset>>(okResult.Value);

        Assert.Equal(2, assets.Count());
    }
}
