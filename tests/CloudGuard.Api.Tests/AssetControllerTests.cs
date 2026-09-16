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
                ServerRoom = "Room 01"
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

    // 👇 ADDED TO COVER EXPORTAUDITCSV (19 MISSING LINES IN ASSETCONTROLLER)
    [Fact]
    public async Task ExportAuditCsv_ReturnsFileContentResult_WithCorrectCsvFormat()
    {
        // Arrange
        var assetServiceMock = Substitute.For<IAssetService>();
        var auditedAt = new DateTime(2026, 1, 15, 10, 30, 0, DateTimeKind.Utc);
        var sampleAssets = new List<ServerAsset>
        {
            new()
            {
                Id = Guid.NewGuid(),
                ServerName = "b1-r1",
                OperatingSystem = "Ubuntu",
                MissingPatches = 0,
                SecurityStatus = "Compliant",
                LastAuditedAt = auditedAt,
                BuildingName = "Building 1",
                ServerRoom = "Room 01"
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

        // Verify the generated string bytes contain the expected header and row count
        var csvContent = Encoding.UTF8.GetString(fileResult.FileContents);
        var csvLines = csvContent
            .Split(new[] { "\r\n", "\n" }, StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        Assert.Equal(2, csvLines.Count);
        Assert.Equal("Server Name,Operating System,Missing Patches,Security Status,Building,Server Room,Last Audited", csvLines[0]);
        Assert.Equal($"\"b1-r1\",\"Ubuntu\",0,\"Compliant\",\"Building 1\",\"Room 01\",\"{auditedAt:yyyy-MM-dd HH:mm:ss}\"", csvLines[1]);
    }
}
