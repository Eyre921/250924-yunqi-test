// 玩家接口
export interface Player {
  id: string;
  name: string;
  createdAt: Date;
}

// ELO 评分接口
export interface EloRating {
  playerId: string;
  gameId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  lastUpdated: Date;
}

// 游戏接口
export interface Game {
  id: string;
  name: string;
  description?: string;
  kFactor: number; // ELO 算法的 K 值
  defaultRating: number; // 默认起始评分
  createdAt: Date;
  updatedAt: Date;
}

// 比赛结果中的玩家排名
export interface MatchPlayerResult {
  playerId: string;
  playerName: string;
  position: number; // 排名位置 (1 = 第一名, 2 = 第二名, 等等)
  previousRating: number;
  newRating: number;
  ratingChange: number;
}

// 比赛记录接口
export interface Match {
  id: string;
  gameId: string;
  gameName: string;
  playerResults: MatchPlayerResult[];
  createdAt: Date;
  notes?: string;
}

// 排行榜条目接口
export interface LeaderboardEntry {
  player: Player;
  rating: EloRating;
  rank: number;
}

// 表单数据类型
export interface CreateGameFormData {
  name: string;
  description?: string;
  kFactor: number;
  defaultRating: number;
}

export interface SubmitMatchFormData {
  gameId: string;
  playerResults: {
    playerName: string;
    position: number;
  }[];
  notes?: string;
}

// ELO 计算配置
export interface EloCalculationConfig {
  kFactor: number;
  defaultRating: number;
}

// ELO 计算结果
export interface EloCalculationResult {
  playerId: string;
  previousRating: number;
  newRating: number;
  ratingChange: number;
}

// 应用状态接口
export interface AppState {
  games: Game[];
  players: Player[];
  matches: Match[];
  eloRatings: EloRating[];
}

// 统计数据接口
export interface PlayerStats {
  totalGames: number;
  winRate: number;
  averageRating: number;
  bestRating: number;
  currentStreak: number;
  longestStreak: number;
}

// 游戏统计接口
export interface GameStats {
  totalMatches: number;
  totalPlayers: number;
  averageRating: number;
  mostActivePlayer: string;
  recentActivity: Match[];
}

// Toast 通知类型
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// 排序选项
export type SortOption = 'rating' | 'gamesPlayed' | 'winRate' | 'name';
export type SortDirection = 'asc' | 'desc';

// 过滤选项
export interface FilterOptions {
  gameId?: string;
  minGames?: number;
  minRating?: number;
  maxRating?: number;
}