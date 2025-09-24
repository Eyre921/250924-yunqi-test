'use client';

import React, { useState, useEffect } from 'react';
import { Game } from '@/types';
import { storage } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import { Trash2, Settings, Users, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GameListProps {
  onGameSelect?: (game: Game) => void;
  selectedGameId?: string;
  refreshTrigger?: number;
}

const GameList: React.FC<GameListProps> = ({
  onGameSelect,
  selectedGameId,
  refreshTrigger,
}) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGames = () => {
    try {
      const gameList = storage.getGames();
      setGames(gameList);
    } catch (error) {
      console.error('Error loading games:', error);
      toast.error('加载游戏列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, [refreshTrigger]);

  const handleDeleteGame = (game: Game) => {
    if (window.confirm(`确定要删除游戏 "${game.name}" 吗？这将删除所有相关的比赛记录和评分数据。`)) {
      try {
        const success = storage.deleteGame(game.id);
        if (success) {
          toast.success(`游戏 "${game.name}" 已删除`);
          loadGames();
        } else {
          toast.error('删除游戏失败');
        }
      } catch (error) {
        console.error('Error deleting game:', error);
        toast.error('删除游戏失败');
      }
    }
  };

  const getGameStats = (game: Game) => {
    const matches = storage.getMatchesByGame(game.id);
    const ratings = storage.getRatingsByGame(game.id);
    
    return {
      totalMatches: matches.length,
      totalPlayers: ratings.length,
      recentMatch: matches.length > 0 ? matches[matches.length - 1] : null,
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-gray-500 mb-4">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            还没有创建任何游戏
          </div>
          <p className="text-sm text-gray-400">
            创建第一个游戏来开始使用 ELO 评分系统
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        游戏列表 ({games.length})
      </h3>
      
      {games.map((game) => {
        const stats = getGameStats(game);
        const isSelected = selectedGameId === game.id;
        
        return (
          <Card
            key={game.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
            }`}
            onClick={() => onGameSelect?.(game)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-1">{game.name}</CardTitle>
                  {game.description && (
                    <p className="text-sm text-gray-600 mb-2">{game.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="info" size="sm">
                      K值: {game.kFactor}
                    </Badge>
                    <Badge variant="default" size="sm">
                      起始: {game.defaultRating}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: 实现编辑功能
                      toast('编辑功能即将推出');
                    }}
                    className="p-2"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGame(game);
                    }}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <Trophy className="h-4 w-4 mr-1" />
                  {stats.totalMatches} 场比赛
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {stats.totalPlayers} 名玩家
                </div>
                <div className="text-gray-500 col-span-2">
                  创建于: {formatDate(new Date(game.createdAt))}
                </div>
              </div>
              
              {stats.recentMatch && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    最近比赛: {formatDate(new Date(stats.recentMatch.createdAt))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GameList;