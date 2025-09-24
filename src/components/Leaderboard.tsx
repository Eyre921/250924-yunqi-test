'use client';

import React, { useState, useEffect } from 'react';
import { Game, LeaderboardEntry, Player, EloRating } from '@/types';
import { storage } from '@/lib/storage';
import { getRatingTier, calculateWinRate } from '@/lib/elo';
import { formatNumber, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Select from './ui/Select';
import LoadingSpinner from './ui/LoadingSpinner';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LeaderboardProps {
  selectedGame?: Game;
  onGameChange?: (gameId: string) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ selectedGame, onGameChange }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string>(selectedGame?.id || '');

  useEffect(() => {
    const gameList = storage.getGames();
    setGames(gameList);
    
    if (!selectedGameId && gameList.length > 0) {
      setSelectedGameId(gameList[0].id);
    }
    
    setLoading(false);
  }, [selectedGameId]);

  useEffect(() => {
    if (selectedGame) {
      setSelectedGameId(selectedGame.id);
    }
  }, [selectedGame]);

  useEffect(() => {
    if (selectedGameId) {
      loadLeaderboard(selectedGameId);
    }
  }, [selectedGameId]);

  const loadLeaderboard = (gameId: string) => {
    setLoading(true);
    
    try {
      const players = storage.getPlayers();
      const ratings = storage.getEloRatings();
      
      const gameRatings = ratings.filter(rating => rating.gameId === gameId);
      
      const leaderboardData: LeaderboardEntry[] = gameRatings
        .map(rating => {
          const player = players.find(p => p.id === rating.playerId);
          if (!player) return null;
          
          const winRate = calculateWinRate(rating.wins, rating.losses, rating.draws);
          const tier = getRatingTier(rating.rating);
          
          return {
            playerId: player.id,
            playerName: player.name,
            rating: rating.rating,
            gamesPlayed: rating.gamesPlayed,
            wins: rating.wins,
            losses: rating.losses,
            draws: rating.draws,
            winRate,
            tier: tier.name,
            tierColor: tier.color,
            lastUpdated: rating.lastUpdated,
          };
        })
        .filter((entry): entry is LeaderboardEntry => entry !== null)
        .sort((a, b) => b.rating - a.rating);
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGameChange = (gameId: string) => {
    setSelectedGameId(gameId);
    onGameChange?.(gameId);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-gray-500 font-medium">#{rank}</span>;
    }
  };

  const getRatingChangeIcon = (winRate: number) => {
    if (winRate > 60) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (winRate < 40) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const gameOptions = games.map(game => ({
    value: game.id,
    label: game.name,
  }));

  const selectedGameData = games.find(g => g.id === selectedGameId);

  if (games.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 排行榜</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无游戏，请先创建游戏</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏆 排行榜</CardTitle>
        <div className="mt-4">
          <Select
            label="选择游戏"
            placeholder="请选择游戏"
            options={gameOptions}
            value={selectedGameId}
            onChange={(e) => handleGameChange(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" text="加载排行榜..." />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedGameData ? `${selectedGameData.name} 暂无玩家数据` : '暂无数据'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              提交比赛结果后将显示排行榜
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 排行榜头部信息 */}
            {selectedGameData && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">{selectedGameData.name}</h3>
                    <p className="text-sm text-blue-700">
                      {leaderboard.length} 名玩家 • K值: {selectedGameData.kFactor} • 默认评分: {selectedGameData.defaultRating}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600">创建时间</p>
                    <p className="text-xs text-blue-500">{formatDate(selectedGameData.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 排行榜列表 */}
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center p-4 rounded-lg border transition-all hover:shadow-md ${
                    index < 3
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* 排名 */}
                  <div className="flex-shrink-0 w-12 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* 玩家信息 */}
                  <div className="flex-1 min-w-0 ml-4">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900 truncate">
                        {entry.playerName}
                      </h4>
                      <Badge
                        variant={
                          entry.tierColor === 'yellow' ? 'warning' :
                          entry.tierColor === 'blue' ? 'info' :
                          entry.tierColor === 'purple' ? 'default' :
                          entry.tierColor === 'red' ? 'error' :
                          entry.tierColor === 'green' ? 'success' : 'outline'
                        }
                        size="sm"
                      >
                        {entry.tier}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center">
                        {getRatingChangeIcon(entry.winRate)}
                        <span className="ml-1">胜率 {formatNumber(entry.winRate, 1)}%</span>
                      </span>
                      <span>
                        {entry.wins}胜 {entry.losses}负 {entry.draws}平
                      </span>
                      <span>{entry.gamesPlayed} 场比赛</span>
                    </div>
                  </div>

                  {/* 评分 */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(entry.rating, 0)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(entry.lastUpdated)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 统计信息 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {leaderboard.length}
                </div>
                <div className="text-sm text-gray-600">总玩家数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(leaderboard.reduce((sum, entry) => sum + entry.gamesPlayed, 0), 0)}
                </div>
                <div className="text-sm text-gray-600">总比赛数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {leaderboard.length > 0 ? formatNumber(Math.max(...leaderboard.map(e => e.rating)), 0) : 0}
                </div>
                <div className="text-sm text-gray-600">最高评分</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {leaderboard.length > 0 ? formatNumber(leaderboard.reduce((sum, entry) => sum + entry.rating, 0) / leaderboard.length, 0) : 0}
                </div>
                <div className="text-sm text-gray-600">平均评分</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;