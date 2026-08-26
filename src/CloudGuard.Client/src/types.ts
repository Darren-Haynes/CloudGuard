export interface ServerAsset {
  id: string;
  serverName: string;
  operatingSystem: string;
  missingPatches: number;
  securityStatus: 'Compliant' | 'Vulnerable' | 'Critical';
  lastAuditedAt: string;
}
