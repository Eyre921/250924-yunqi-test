'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Game, SubmitMatchFormData, MatchPlayerResult } from '@/types';
import { storage } from '@/lib/storage';
import { calculateMultiPlayerElo, validateMatchResults } from '@/lib/elo';
import { isValidPlayerName } from '@/lib/utils';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Plus, Minus, Trophy } from 'lucide-react';

interface MatchFormProps {
  selectedGame?: Game;
  onMatchSubmitted?: () => void;
}

const MatchForm: React.FC<MatchFormProps> = ({ selectedGame, onMatchSubmitted }) => {
  const [games, setGames] = useState<Game[]>([]);
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubmitMatchFormData>({
    defaultValues: {
      gameId: selectedGame?.id || '',
      playerResults: [
        { playerName: '', position: 1 },
        { playerName: '', position: 2 },
      ],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'playerResults',
  });

  const watchedGameId = watch('gameId');
  const watchedPlayerResults = watch('playerResults');

  useEffect(() => {
    const gameList = storage.getGames();
    setGames(gameList);
  }, []);

  useEffect(() => {
    if (selectedGame) {
      setValue('gameId', selectedGame.id);
    }
  }, [selectedGame, setValue]);

  const addPlayer = () => {
    const nextPosition = Math.max(...watchedPlayerResults.map(p => p.position)) + 1;
    append({ playerName: '', position: nextPosition });
  };

  const removePlayer = (index: number) => {
    if (fields.length > 2) {
      remove(index);
      // 重新调整排名
      const updatedResults = watchedPlayerResults.filter((_, i) => i !== index);
      updatedResults.forEach((result, i) => {
        setValue(`playerResults.${i}.position`, i + 1);
      });
    }
  };

  const onSubmit = async (data: SubmitMatchFormData) => {
    try {
      // 验证比赛结果
      const validation = validateMatchResults(data.playerResults);
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      // 验证玩家名称
      for (const result of data.playerResults) {
        if (!isValidPlayerName(result.playerName)) {
          toast.error(`玩家名称 "${result.playerName}" 格式不正确`);
          return;
        }
      }

      const game = games.find(g => g.id === data.gameId);
      if (!game) {
        toast.error('请选择一个游戏');
        return;
      }

      // 创建或获取玩家
      const players = data.playerResults.map(result => {
        return storage.addPlayer(result.playerName.trim());
      });

      // 获取当前评分
      const currentRatings = players.map(player => {
        const rating = storage.getPlayerRating(player.id, game.id);
        return {
          playerId: player.id,
          position: data.playerResults.find(r => r.playerName.trim().toLowerCase() === player.name.toLowerCase())!.position,
          currentRating: rating?.rating || game.defaultRating,
        };
      });

      // 计算新评分
      const eloResults = calculateMultiPlayerElo(currentRatings, {
        kFactor: game.kFactor,
        defaultRating: game.defaultRating,
      });

      // 更新评分
      const matchPlayerResults: MatchPlayerResult[] = [];
      
      for (const result of eloResults) {
        const player = players.find(p => p.id === result.playerId)!;
        const position = currentRatings.find(r => r.playerId === result.playerId)!.position;
        const currentRating = storage.getPlayerRating(result.playerId, game.id);
        
        // 计算胜负平
        let wins = 0;
        let losses = 0;
        let draws = 0;
        
        for (const otherResult of currentRatings) {
          if (otherResult.playerId === result.playerId) continue;
          
          if (position < otherResult.position) {
            wins++;
          } else if (position > otherResult.position) {
            losses++;
          } else {
            draws++;
          }
        }
        
        // 更新玩家评分
        storage.updatePlayerRating(result.playerId, game.id, {
          rating: result.newRating,
          gamesPlayed: (currentRating?.gamesPlayed || 0) + 1,
          wins: (currentRating?.wins || 0) + wins,
          losses: (currentRating?.losses || 0) + losses,
          draws: (currentRating?.draws || 0) + draws,
        });

        matchPlayerResults.push({
          playerId: result.playerId,
          playerName: player.name,
          position,
          previousRating: result.previousRating,
          newRating: result.newRating,
          ratingChange: result.ratingChange,
        });
      }

      // 保存比赛记录
      storage.addMatch({
        gameId: game.id,
        gameName: game.name,
        playerResults: matchPlayerResults,
        notes: data.notes?.trim() || undefined,
      });

      // 显示结果
      toast.success('比赛结果提交成功！');
      
      // 显示评分变化
      matchPlayerResults.forEach(result => {
        const changeText = result.ratingChange > 0 
          ? `+${result.ratingChange}` 
          : result.ratingChange.toString();
        toast.success(
          `${result.playerName}: ${result.previousRating} → ${result.newRating} (${changeText})`,
          { duration: 6000 }
        );
      });

      reset();
      onMatchSubmitted?.();
    } catch (error) {
      console.error('Error submitting match:', error);
      toast.error('提交比赛结果失败，请重试');
    }
  };

  const gameOptions = games.map(game => ({
    value: game.id,
    label: game.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 提交比赛结果</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="选择游戏 *"
            placeholder="请选择游戏"
            options={gameOptions}
            {...register('gameId', {
              required: '请选择一个游戏',
            })}
            error={errors.gameId?.message}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">
                玩家排名 ({fields.length} 名玩家)
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPlayer}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                添加玩家
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-16">
                    <Input
                      label="排名"
                      type="number"
                      min="1"
                      max={fields.length}
                      {...register(`playerResults.${index}.position`, {
                        required: '排名不能为空',
                        min: { value: 1, message: '排名不能小于1' },
                        max: { value: fields.length, message: `排名不能大于${fields.length}` },
                        valueAsNumber: true,
                      })}
                      error={errors.playerResults?.[index]?.position?.message}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      label="玩家名称"
                      placeholder="输入玩家名称"
                      {...register(`playerResults.${index}.playerName`, {
                        required: '玩家名称不能为空',
                        minLength: {
                          value: 2,
                          message: '玩家名称至少需要2个字符',
                        },
                        maxLength: {
                          value: 20,
                          message: '玩家名称不能超过20个字符',
                        },
                      })}
                      error={errors.playerResults?.[index]?.playerName?.message}
                    />
                  </div>
                  
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(index)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start">
                <Trophy className="h-4 w-4 mr-2 mt-0.5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">排名说明：</p>
                  <ul className="mt-1 space-y-1 text-blue-700">
                    <li>• 1 = 第一名（最高排名）</li>
                    <li>• 允许并列排名（如两个第一名）</li>
                    <li>• 排名必须从1开始且连续</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Input
            label="备注"
            placeholder="添加比赛备注（可选）"
            {...register('notes', {
              maxLength: {
                value: 500,
                message: '备注不能超过500个字符',
              },
            })}
            error={errors.notes?.message}
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              重置
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting || !watchedGameId}
            >
              提交结果
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MatchForm;