export type KeywordRecord = {
  id: string;
  businessId: string;
  keyword: string;
  neighborhood: string;
  createdAt: string;
};

export type BusinessRecord = {
  id: string;
  ownerEmail: string;
  name: string;
  gmbName: string;
  website: string | null;
  primaryCity: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorEntry = {
  name: string;
  url: string | null;
  position: number;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  isTarget: boolean;
};

export type RankingResultInput = {
  keywordId: string;
  keyword: string;
  neighborhood: string;
  targetPosition: number | null;
  visibilityScore: number;
  competitors: CompetitorEntry[];
};

export type RankingResultRecord = RankingResultInput & {
  id: string;
  checkId: string;
  createdAt: string;
};

export type RankingCheckRecord = {
  id: string;
  businessId: string;
  checkedAt: string;
  source: string;
  results: RankingResultRecord[];
};

export type TrendPoint = {
  checkedAt: string;
  averagePosition: number;
  visibilityScore: number;
};
