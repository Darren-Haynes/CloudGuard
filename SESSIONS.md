# CloudGuard Architecture & Development History

This document serves as the master full-stack roadmap and tracking ledger for the **CloudGuard Corporate Security & Patch Compliance Infrastructure Platform**. 

---

## 🏗️ 1. Global Project Directory Architecture
The repository is structured following modern enterprise separation of concerns, decoupling our data-streaming backend engine from our reactive frontend administration viewport.

```text
CloudGuard/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Linux Build Runner Engine
├── src/
│   ├── CloudGuard.Api/
│   │   ├── Controllers/
│   │   │   └── AssetController.cs     # REST Routing Channel
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs        # EF Core SQLite Model Mapping
│   │   │   └── DbSeeder.cs            # Multi-Node Data Population Utility
│   │   ├── Models/
│   │   │   └── ServerAsset.cs         # Strict Domain Type Schemas
│   │   ├── Services/
│   │   │   ├── IAssetService.cs       # Business Contract Interface
│   │   │   ├── AssetService.cs        # Concrete Implementation Layer
│   │   │   └── VulnerabilityWorker.cs # Asynchronous Simulation Daemon
│   │   ├── Program.cs                 # Main Bootstrap Middleware Core
│   │   └── CloudGuard.Api.csproj      # MSBuild Target & Dependency Manifest
│   └── CloudGuard.Client/
│       ├── src/
│       │   ├── components/
│       │   │   ├── DashboardTable.tsx # Sorted/Filtered Viewport Table
│       │   │   ├── FilterBar.tsx      # Responsive Dual Search Panel
│       │   │   └── MetricCards.tsx    # Live Aggregation Summary Grid
│       │   ├── services/
│       │   │   └── api.ts             # Asynchronous Fetch Service Client
│       │   ├── App.tsx                # Client State Controller & Lifecycle
│       │   └── types.ts               # Strict TypeScript Contract Typings
│       └── package.json               # Frontend Dependency Script Matrix
└── tests/
    └── CloudGuard.Api.Tests/
        ├── AssetControllerTests.cs    # Endpoint Mock Interface Suites
        ├── AssetServiceTests.cs       # Data-Tier Integration Tests
        ├── DbSeederTests.cs           # Defensive Initialization Tests
        └── VulnerabilityWorkerTests.cs# Asynchronous Timing Tipping-Point Tests
```

---

## 🛠️ 2. Core Developer Tooling Configurations

### Multi-Stack Testing Script (`package.json`)
We integrated the `concurrently` package to allow single-command, parallel validations of both compilation frameworks side-by-side inside **WezTerm**, complete with colored prefix flags:
```json
"test:all": "concurrently --names \"TS,NET\" --prefix-colors \"cyan,green\" \"npx tsc --noEmit\" \"dotnet test ../../ /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura\""
```

### Automated MSBuild Database Reset (`CloudGuard.Api.csproj`)
To eliminate manual terminal bash operations, we embedded a cross-platform cleanup target directly into the .NET compile lifecycle to wipe local database locks cleanly during local `Debug` execution cycles:
```xml
<Target Name="DeleteSqliteDb" BeforeTargets="Clean;BeforeBuild" Condition="'\$(Configuration)' == 'Debug'">
  <ItemGroup>
    <FilesToDelete Include="cloudguard.db;cloudguard.db-shm;cloudguard.db-wal" />
  </ItemGroup>
  <Delete Files="@(FilesToDelete)" ContinueOnError="true" />
  <Message Importance="high" Text="🧹 CloudGuard MSBuild: Cleaned local SQLite database files successfully." Condition="Exists('cloudguard.db')" />
</Target>
```

### Git Optimization Shortcut
Configured the local Git engine to automatically sweep out dead tracking references dynamically during everyday branch transitions:
```bash
git config --global fetch.prune true
```

---

## 📡 3. Core Architectural Implementations

### Backend: Decoupled Service Layer (`AssetService.cs`)
Utilizes C# 12 **Primary Constructors** to completely isolate our database context operations away from the REST entry layers:
```csharp
public class AssetController(IAssetService assetService) : ControllerBase { ... }
```

### Backend: Asynchronous Simulation Daemon (`VulnerabilityWorker.cs`)
A hosted C# background worker daemon that boots up on application start and processes background telemetry mutations independently every 10 seconds through a scoped dependency pipeline.

### Frontend: Flicker-Free Background Data Polling
Upgraded the React `useEffect` lifecycles to map out a 5-second asynchronous timer pipeline. By routing an explicit `isInitialLoad` conditional flag, background refreshes remain entirely silent—updating numbers in memory with zero user visual layout shifts:
```tsx
const intervalId = setInterval(() => { loadAssets(false); }, 5000);
```

### Frontend: Responsive Multi-Input Filtering & Column Sorting
- Handles dual-input case-insensitive search parameterization matching (Server Name and Operating System) across fluid, mobile-responsive grids.
- Computes structural table row reorganizations dynamically using text `.localeCompare()` algorithms backed by a **secondary alphabetical server name tie-breaker** to handle matching classification groups.

---

## 📈 4. Continuous Integration & Codecov Testing Architecture
We established an automated DevOps tracking foundation utilizing **GitHub Actions** and **Codecov** analytics from the initial sprint.

### Deterministic xUnit Testing Blueprint
To prevent flaky cloud test indicators caused by sluggish shared hosted processors, our background service integration test framework completely avoids arbitrary millisecond thread delays. Instead, it utilizes pre-canceled cancellation tokens to deterministically pass exactly one iteration tick step across independent, in-memory SQLite layers (`DataSource=:memory:`):
```csharp
using var cts = new CancellationTokenSource();
await cts.CancelAsync();
await worker.TriggerExecuteAsync(cts.Token);
```

### Active Test Matrix Suite Summary
Our testing suite has successfully scaled out across **7 comprehensive, enterprise-grade test assertions** with active terminal code coverage reporting sitting at an overall **21.41% global index**, providing complete structural verification across:
1. **Happy-Path Routing:** Validates `AssetController` returns correct HTTP responses holding data collections.
2. **Data Isolation Operations:** Asserts the concrete `AssetService` correctly translates entities out of the database tier.
3. **Empty Data Seeding:** Verifies that `DbSeeder` smoothly generates all 10 channel island corporate server nodes on initial startup.
4. **Defensive Seeding Boundaries:** Proves the seeder engine gracefully skips calculations and injects nothing if existing files are tracked.
5. **Daemon Logic Execution:** Verifies baseline metrics incrementation and progression rules.
6. **Critical Tipping-Point Thresholds:** Asserts items correctly scale from `Vulnerable` to `Critical` at the exact 10-patch limit.
