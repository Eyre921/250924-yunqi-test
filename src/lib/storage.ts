import { Game, Player, Match, EloRating, AppState } from '@/types';
import { generateId } from './utils';

const STORAGE_KEYS = {
  GAMES: 'elo-app-games',
  PLAYERS: 'elo-app-players',
  MATCHES: 'elo-app-matches',
  ELO_RATINGS: 'elo-app-elo-ratings',
} as const;

// 存储工具类
class StorageManager {
  private isClient(): boolean {
    return typeof window !== 'undefined';
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isClient()) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage for key ${key}:`, error);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isClient()) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage for key ${key}:`, error);
    }
  }

  // 游戏管理
  getGames(): Game[] {
    return this.getItem(STORAGE_KEYS.GAMES, []);
  }

  saveGames(games: Game[]): void {
    this.setItem(STORAGE_KEYS.GAMES, games);
  }

  addGame(gameData: Omit<Game, 'id' | 'createdAt' | 'updatedAt'>): Game {
    const games = this.getGames();
    const newGame: Game = {
      ...gameData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    games.push(newGame);
    this.saveGames(games);
    return newGame;
  }

  updateGame(gameId: string, updates: Partial<Omit<Game, 'id' | 'createdAt'>>): Game | null {
    const games = this.getGames();
    const gameIndex = games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) return null;
    
    games[gameIndex] = {
      ...games[gameIndex],
      ...updates,
      updatedAt: new Date(),
    };
    
    this.saveGames(games);
    return games[gameIndex];
  }

  deleteGame(gameId: string): boolean {
    const games = this.getGames();
    const filteredGames = games.filter(g => g.id !== gameId);
    
    if (filteredGames.length === games.length) return false;
    
    this.saveGames(filteredGames);
    
    // 同时删除相关的比赛记录和评分
    this.deleteMatchesByGame(gameId);
    this.deleteRatingsByGame(gameId);
    
    return true;
  }

  // 玩家管理
  getPlayers(): Player[] {
    return this.getItem(STORAGE_KEYS.PLAYERS, []);
  }

  savePlayers(players: Player[]): void {
    this.setItem(STORAGE_KEYS.PLAYERS, players);
  }

  addPlayer(name: string): Player {
    const players = this.getPlayers();
    const existingPlayer = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingPlayer) {
      return existingPlayer;
    }
    
    const newPlayer: Player = {
      id: generateId(),
      name: name.trim(),
      createdAt: new Date(),
    };
    
    players.push(newPlayer);
    this.savePlayers(players);
    return newPlayer;
  }

  getPlayerByName(name: string): Player | null {
    const players = this.getPlayers();
    return players.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  // 比赛记录管理
  getMatches(): Match[] {
    return this.getItem(STORAGE_KEYS.MATCHES, []);
  }

  saveMatches(matches: Match[]): void {
    this.setItem(STORAGE_KEYS.MATCHES, matches);
  }

  addMatch(match: Omit<Match, 'id' | 'createdAt'>): Match {
    const matches = this.getMatches();
    const newMatch: Match = {
      ...match,
      id: generateId(),
      createdAt: new Date(),
    };
    
    matches.push(newMatch);
    this.saveMatches(matches);
    return newMatch;
  }

  getMatchesByGame(gameId: string): Match[] {
    const matches = this.getMatches();
    return matches.filter(m => m.gameId === gameId);
  }

  deleteMatchesByGame(gameId: string): void {
    const matches = this.getMatches();
    const filteredMatches = matches.filter(m => m.gameId !== gameId);
    this.saveMatches(filteredMatches);
  }

  // ELO 评分管理
  getEloRatings(): EloRating[] {
    return this.getItem(STORAGE_KEYS.ELO_RATINGS, []);
  }

  saveEloRatings(ratings: EloRating[]): void {
    this.setItem(STORAGE_KEYS.ELO_RATINGS, ratings);
  }

  getPlayerRating(playerId: string, gameId: string): EloRating | null {
    const ratings = this.getEloRatings();
    return ratings.find(r => r.playerId === playerId && r.gameId === gameId) || null;
  }

  updatePlayerRating(playerId: string, gameId: string, updates: Partial<EloRating>): EloRating {
    const ratings = this.getEloRatings();
    const existingRatingIndex = ratings.findIndex(r => r.playerId === playerId && r.gameId === gameId);
    
    if (existingRatingIndex !== -1) {
      ratings[existingRatingIndex] = {
        ...ratings[existingRatingIndex],
        ...updates,
        lastUpdated: new Date(),
      };
    } else {
      const game = this.getGames().find(g => g.id === gameId);
      const newRating: EloRating = {
        playerId,
        gameId,
        rating: game?.defaultRating || 1500,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        lastUpdated: new Date(),
        ...updates,
      };
      ratings.push(newRating);
    }
    
    this.saveEloRatings(ratings);
    return ratings.find(r => r.playerId === playerId && r.gameId === gameId)!;
  }

  getRatingsByGame(gameId: string): EloRating[] {
    const ratings = this.getEloRatings();
    return ratings.filter(r => r.gameId === gameId);
  }

  deleteRatingsByGame(gameId: string): void {
    const ratings = this.getEloRatings();
    const filteredRatings = ratings.filter(r => r.gameId !== gameId);
    this.saveEloRatings(filteredRatings);
  }

  // 获取完整应用状态
  getAppState(): AppState {
    return {
      games: this.getGames(),
      players: this.getPlayers(),
      matches: this.getMatches(),
      eloRatings: this.getEloRatings(),
    };
  }

  // 清空所有数据
  clearAllData(): void {
    if (!this.isClient()) return;
    
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // 导出数据
  exportData(): string {
    const data = this.getAppState();
    return JSON.stringify(data, null, 2);
  }

  // 导入数据
  importData(jsonData: string): boolean {
    try {
      const data: AppState = JSON.parse(jsonData);
      
      // 验证数据结构
      if (!data.games || !data.players || !data.matches || !data.eloRatings) {
        throw new Error('Invalid data structure');
      }
      
      this.saveGames(data.games);
      this.savePlayers(data.players);
      this.saveMatches(data.matches);
      this.saveEloRatings(data.eloRatings);
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// 创建单例实例
export const storage = new StorageManager();