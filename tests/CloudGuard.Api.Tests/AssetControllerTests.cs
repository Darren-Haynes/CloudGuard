using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
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
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var sampleAssets = new List<ServerAsset>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ServerName = "test-server-01",
                OperatingSystem = "Ubuntu",
                MissingPatches = 2,
                SecurityStatus = "Vulnerable",
                LastAuditedAt = DateTime.UtcNow,
                BuildingName = "Building 1",
                ServerRoom = "Room 01",
                LastShellCommands = "df -h"
            }
        };

        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(sampleAssets));

        // Act
        var controller = new AssetController(assetServiceMock);
        var result = await controller.GetAssets();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var assets = Assert.IsAssignableFrom<IEnumerable<ServerAsset>>(okResult.Value);
        Assert.Single(assets);
    }

    [Fact]
    public async Task ExportAuditCsv_ReturnsFileContentResult_WithCorrectCsvFormat()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var sampleAssets = new List<ServerAsset>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ServerName = "b1-r1",
                OperatingSystem = "Ubuntu",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow,
                BuildingName = "Building 1",
                ServerRoom = "Room 01",
                LastShellCommands = "df -h"
            }
        };

        assetServiceMock.GetScopedAssetsAsync("Building 1", "Room 01")
            .Returns(Task.FromResult<IEnumerable<ServerAsset>>(sampleAssets));

        var controller = new AssetController(assetServiceMock);

        // Act
        var result = await controller.ExportAuditCsv("Building 1", "Room 01");

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/csv", fileResult.ContentType);
        Assert.Equal("cloudguard_building1_room01_audit.csv", fileResult.FileDownloadName);

        var csvContent = Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Contains("Server Name,Operating System,Missing Patches,Security Status", csvContent);
    }

    // 👇 ADDED TO COVER EXPORT_SINGLE_SERVER_TXT (43 MISSING PATCH LINES IN CODECOV)
    [Fact]
    public async Task ExportSingleServerTxt_ReturnsFileContentResult_WithCorrectPlainTextsFormat()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var targetId = Guid.NewGuid();
        var sampleAssets = new List<ServerAsset>
        {
            new()
            {
                Id = targetId,
                ServerName = "b2-r1-server-007",
                OperatingSystem = "Ubuntu 22.04 LTS",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = DateTime.UtcNow,
                BuildingName = "Building 2",
                ServerRoom = "Room 01",
                CpuCoreCount = 8,
                InstalledRamGb = 32,
                FreeRamGb = 14.5,
                IpAddress = "10.2.10.5",
                MacAddress = "00:11:22:33:44:55",
                UptimeSeconds = 86400,
                CpuAgeMonths = 12,
                RamAgeMonths = 12,
                DiskAgeMonths = 12,
                LastShellCommands = "sudo apt-get update\nclear"
            }
        };

        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(sampleAssets));
        var controller = new AssetController(assetServiceMock);

        // Act
        var result = await controller.ExportAssetTextReport(targetId);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/plain", fileResult.ContentType);
        Assert.Equal($"cloudguard_audit_b2-r1-server-007.txt", fileResult.FileDownloadName);

        // Verify that report contents accurately hold our key telemetry variables
        var reportContent = Encoding.UTF8.GetString(fileResult.FileContents);
        Assert.Contains("b2-r1-server-007", reportContent);
        Assert.Contains("8", reportContent); // Asserts core count parameter presence
        Assert.Contains("10.2.10.5", reportContent);
        Assert.Contains("sudo apt-get update", reportContent);
        // Assert
    }

    // 👇 ADDED TO COVER THE ASSET == NULL DEFENSIVE DROPOUT GATEWAYS
    [Fact]
    public async Task ExportAssetTextReport_ReturnsNotFound_WhenAssetDoesNotExist()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var nonExistentId = Guid.NewGuid();

        // Return an empty collection to force the lookup comparison to return null
        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(new List<ServerAsset>()));
        var controller = new AssetController(assetServiceMock);

        // Act
        var result = await controller.ExportAssetTextReport(nonExistentId);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    // 👇 ADDED TO COVER THE REMEDIATE_ASSET_PATCHES POST ENDPOINT CHANNEL
    [Fact]
    public async Task RemediateAssetPatches_ReturnsOkResult_WithZeroedMissingPatches()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var targetId = Guid.NewGuid();
        var sampleAsset = new ServerAsset
        {
            Id = targetId,
            ServerName = "vulnerable-node-99",
            OperatingSystem = "Ubuntu",
            MissingPatches = 5,
            SecurityStatus = "Vulnerable",
            LastAuditedAt = DateTime.UtcNow.AddDays(-1),
            BuildingName = "Building 1",
            ServerRoom = "Room 01",
            LastShellCommands = "df -h"
        };

        // Mock the retrieval and update tracking sequences
        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(new List<ServerAsset> { sampleAsset }));
        assetServiceMock.UpdateAssetAsync(Arg.Any<ServerAsset>()).Returns(Task.CompletedTask);

        var controller = new AssetController(assetServiceMock);

        // Act
        var result = await controller.RemediateAssetPatches(targetId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);

        // Use reflection or dynamic property parsing to check our returned payload variables
        var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
        Assert.Contains("Successfully deployed patch matrices", json);
        Assert.Contains("Compliant", json);
        Assert.Contains("\"MissingPatches\":0", json);

        // Verify that the Polly resilient tier was explicitly invoked to lock updates
        await assetServiceMock.Received(1).UpdateAssetAsync(Arg.Is<ServerAsset>(a => a.MissingPatches == 0 && a.SecurityStatus == "Compliant"));
    }

    // 👇 ADDED TO COVER THE ASSET.MISSINGPATCHES == 0 BADREQUEST DEFENSIVE GATEWAY
    [Fact]
    public async Task RemediateAssetPatches_ReturnsBadRequest_WhenAssetIsAlreadyCompliant()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var targetId = Guid.NewGuid();
        var compliantAsset = new ServerAsset
        {
            Id = targetId,
            ServerName = "already-compliant-node",
            OperatingSystem = "Ubuntu",
            MissingPatches = 0, // 🔥 Set to 0 to trigger the BadRequest validation
            SecurityStatus = "Compliant",
            LastAuditedAt = DateTime.UtcNow,
            BuildingName = "Building 1",
            ServerRoom = "Room 01",
            LastShellCommands = "df -h"
        };

        assetServiceMock.GetAllAssetsAsync().Returns(Task.FromResult<IEnumerable<ServerAsset>>(new List<ServerAsset> { compliantAsset }));
        var controller = new AssetController(assetServiceMock);

        // Act
        var result = await controller.RemediateAssetPatches(targetId);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("already fully compliant", badRequestResult.Value?.ToString());
    }
}
