'use client';

import React, { useState, useEffect } from 'react';
import { Game } from '@/types';
import { storage } from '@/lib/storage';
import GameForm from '@/components/GameForm';
import GameList from '@/components/GameList';
import MatchForm from '@/components/MatchForm';
import Leaderboard from '@/components/Leaderboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Gamepad2, Trophy, Plus, BarChart3 } from 'lucide-react';

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadGames();
  }, [refreshKey]);

  const loadGames = () => {
    const gameList = storage.getGames();
    setGames(gameList);
    
    // 如果当前选中的游戏被删除，清除选择
    if (selectedGame && !gameList.find(g => g.id === selectedGame.id)) {
      setSelectedGame(undefined);
    }
  };

  const handleGameCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleGameDeleted = () => {
    setRefreshKey(prev => prev + 1);
    // 如果删除的是当前选中的游戏，清除选择
    if (selectedGame) {
      const updatedGames = storage.getGames();
      if (!updatedGames.find(g => g.id === selectedGame.id)) {
        setSelectedGame(undefined);
      }
    }
  };

  const handleGameSelected = (game: Game) => {
    setSelectedGame(game);
  };

  const handleMatchSubmitted = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleLeaderboardGameChange = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    setSelectedGame(game);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Gamepad2 className="h-12 w-12 text-blue-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">
            ELO 评分系统
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          支持多人对局的专业评分管理平台，实时计算 ELO 评分并维护排行榜
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Gamepad2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">游戏总数</p>
                <p className="text-2xl font-bold text-gray-900">{games.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">玩家总数</p>
                <p className="text-2xl font-bold text-gray-900">{storage.getPlayers().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">比赛总数</p>
                <p className="text-2xl font-bold text-gray-900">{storage.getMatches().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：游戏管理和比赛提交 */}
        <div className="space-y-8">
          {/* 游戏管理 */}
          <div className="space-y-6">
            <div className="flex items-center">
              <Plus className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">游戏管理</h2>
            </div>
            
            <GameForm onGameCreated={handleGameCreated} />
            
            <GameList
              onGameSelect={handleGameSelected}
              selectedGameId={selectedGame?.id}
              refreshTrigger={refreshKey}
            />
          </div>

          {/* 比赛结果提交 */}
          <div className="space-y-6">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">比赛结果提交</h2>
            </div>
            
            <MatchForm
              selectedGame={selectedGame}
              onMatchSubmitted={handleMatchSubmitted}
            />
          </div>
        </div>

        {/* 右侧：排行榜 */}
        <div className="space-y-6">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 text-yellow-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">排行榜</h2>
          </div>
          
          <Leaderboard
            selectedGame={selectedGame}
            onGameChange={handleLeaderboardGameChange}
          />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>📖 使用说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">1. 创建游戏</h4>
                <p className="text-sm text-gray-600 mb-4">
                  首先创建一个游戏，设置游戏名称、描述、K值和默认评分。K值决定评分变化幅度，默认评分是新玩家的起始分数。
                </p>
                
                <h4 className="font-semibold text-gray-900 mb-2">2. 提交比赛结果</h4>
                <p className="text-sm text-gray-600">
                  选择游戏后，添加参与的玩家并设置他们的排名。系统会自动计算新的 ELO 评分并更新排行榜。
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">3. 查看排行榜</h4>
                <p className="text-sm text-gray-600 mb-4">
                  每个游戏都有独立的排行榜，显示玩家的评分、胜率、比赛记录等详细信息。
                </p>
                
                <h4 className="font-semibold text-gray-900 mb-2">4. 评分规则</h4>
                <p className="text-sm text-gray-600">
                  采用多人 ELO 算法，每个玩家与其他所有玩家进行比较计算评分变化。排名越高获得的评分越多。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}