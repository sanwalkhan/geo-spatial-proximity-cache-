export interface PropertyStats {
  neighbourhood: string;
  count: number;
  constructionYears: number[];
  roomTypes: string[];
  cancellationPolicies: string[];
  hostIdentityVerifiedStatuses: string[];
}

export type CategoryType = "roomTypes" | "cancellationPolicies" | "hostIdentityVerifiedStatuses";
export type HostVerificationStatus = "verified" | "unconfirmed" | "all";