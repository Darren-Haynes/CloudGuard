export interface ServerAsset {
  // Foundational Metadata
  id: string;
  serverName: string;
  operatingSystem: string;
  missingPatches: number;
  securityStatus: 'Compliant' | 'Vulnerable' | 'Critical';
  lastAuditedAt: string;
  buildingName: string;
  serverRoom: string;

  // 🏎️ CORE HARDWARE INFRASTRUCTURE ALLOCATIONS
  cpuCoreCount: number;
  installedRamGb: number;
  ipAddress: string;
  macAddress: string;

  // 📈 LIVE TELEMETRY PERIMETERS
  uptimeSeconds: number;
  freeRamGb: number;

  // ⏳ HARDWARE LIFECYCLE DEGRADATION (AGE IN MONTHS)
  cpuAgeMonths: number;
  ramAgeMonths: number;
  diskAgeMonths: number;

  // 📊 PROGRAMMATIC TIME-SERIES LOAD PERCENTAGES
  avgCpuLoad24H: number;
  avgCpuLoad1W: number;
  avgCpuLoad1M: number;

  avgRamLoad24H: number;
  avgRamLoad1W: number;
  avgRamLoad1M: number;

  // 🛡️ SECURITY AUDIT SHELL LOGS
  lastShellCommands: string;
}
