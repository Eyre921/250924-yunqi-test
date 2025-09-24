'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { CreateGameFormData } from '@/types';
import { storage } from '@/lib/storage';
import { isValidGameName } from '@/lib/utils';
import Input from './ui/Input';
import Button from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface GameFormProps {
  onGameCreated?: () => void;
}

const GameForm: React.FC<GameFormProps> = ({ onGameCreated }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGameFormData>({
    defaultValues: {
      name: '',
      description: '',
      kFactor: 32,
      defaultRating: 1500,
    },
  });

  const onSubmit = async (data: CreateGameFormData) => {
    try {
      // 验证游戏名称
      if (!isValidGameName(data.name)) {
        toast.error('游戏名称必须为2-50个字符');
        return;
      }

      // 检查游戏名称是否已存在
      const existingGames = storage.getGames();
      const nameExists = existingGames.some(
        game => game.name.toLowerCase() === data.name.trim().toLowerCase()
      );

      if (nameExists) {
        toast.error('游戏名称已存在');
        return;
      }

      // 创建游戏
      const newGame = storage.addGame({
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        kFactor: data.kFactor,
        defaultRating: data.defaultRating,
      });

      toast.success(`游戏 "${newGame.name}" 创建成功！`);
      reset();
      onGameCreated?.();
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('创建游戏失败，请重试');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🎮 创建新游戏</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="游戏名称 *"
            placeholder="输入游戏名称"
            {...register('name', {
              required: '游戏名称不能为空',
              minLength: {
                value: 2,
                message: '游戏名称至少需要2个字符',
              },
              maxLength: {
                value: 50,
                message: '游戏名称不能超过50个字符',
              },
            })}
            error={errors.name?.message}
          />

          <Input
            label="游戏描述"
            placeholder="输入游戏描述（可选）"
            {...register('description', {
              maxLength: {
                value: 200,
                message: '描述不能超过200个字符',
              },
            })}
            error={errors.description?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="K值 *"
              type="number"
              placeholder="32"
              helperText="ELO算法的K值，影响评分变化幅度"
              {...register('kFactor', {
                required: 'K值不能为空',
                min: {
                  value: 1,
                  message: 'K值必须大于0',
                },
                max: {
                  value: 100,
                  message: 'K值不能超过100',
                },
                valueAsNumber: true,
              })}
              error={errors.kFactor?.message}
            />

            <Input
              label="默认评分 *"
              type="number"
              placeholder="1500"
              helperText="新玩家的起始评分"
              {...register('defaultRating', {
                required: '默认评分不能为空',
                min: {
                  value: 100,
                  message: '默认评分不能低于100',
                },
                max: {
                  value: 3000,
                  message: '默认评分不能超过3000',
                },
                valueAsNumber: true,
              })}
              error={errors.defaultRating?.message}
            />
          </div>

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
              disabled={isSubmitting}
            >
              创建游戏
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GameForm;