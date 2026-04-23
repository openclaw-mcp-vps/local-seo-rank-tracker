export type LocationInput = {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

export type CompetitorResult = {
  rank: number;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  address: string;
};

export type RankingHistoryPoint = {
  checkedAt: string;
  rank: number | null;
};

export type DashboardKeyword = {
  keywordId: number;
  keyword: string;
  trackedBusiness: string;
  location: LocationInput;
  latestRank: number | null;
  previousRank: number | null;
  checkedAt: string | null;
  competitors: CompetitorResult[];
  history: RankingHistoryPoint[];
};

export type RankingCheckRequest = {
  keyword: string;
  trackedBusiness: string;
  location: LocationInput;
};

export type RankingCheckResult = {
  keywordId: number;
  keyword: string;
  trackedBusiness: string;
  location: LocationInput;
  checkedAt: string;
  localPackRank: number | null;
  competitors: CompetitorResult[];
};
