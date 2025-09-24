import { EloCalculationConfig, EloCalculationResult, MatchPlayerResult } from '@/types';

/**
 * 计算期望得分
 * @param ratingA 玩家A的评分
 * @param ratingB 玩家B的评分
 * @returns 玩家A对玩家B的期望得分
 */
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * 计算实际得分（基于排名）
 * @param playerPosition 玩家的排名位置
 * @param opponentPosition 对手的排名位置
 * @returns 实际得分 (1 = 胜利, 0.5 = 平局, 0 = 失败)
 */
function calculateActualScore(playerPosition: number, opponentPosition: number): number {
  if (playerPosition < opponentPosition) {
    return 1; // 玩家排名更高（数字更小），获胜
  } else if (playerPosition === opponentPosition) {
    return 0.5; // 平局
  } else {
    return 0; // 玩家排名更低，失败
  }
}

/**
 * 多人 ELO 评分计算
 * 使用改进的多人 ELO 算法，每个玩家与其他所有玩家进行比较
 * @param playerResults 所有玩家的比赛结果
 * @param config ELO 计算配置
 * @returns 每个玩家的新评分
 */
export function calculateMultiPlayerElo(
  playerResults: Array<{
    playerId: string;
    position: number;
    currentRating: number;
  }>,
  config: EloCalculationConfig
): EloCalculationResult[] {
  const results: EloCalculationResult[] = [];
  
  // 为每个玩家计算新评分
  for (const player of playerResults) {
    let totalExpectedScore = 0;
    let totalActualScore = 0;
    let totalOpponents = 0;
    
    // 与其他所有玩家进行比较
    for (const opponent of playerResults) {
      if (player.playerId === opponent.playerId) {
        continue; // 跳过自己
      }
      
      // 计算期望得分
      const expectedScore = calculateExpectedScore(player.currentRating, opponent.currentRating);
      totalExpectedScore += expectedScore;
      
      // 计算实际得分
      const actualScore = calculateActualScore(player.position, opponent.position);
      totalActualScore += actualScore;
      
      totalOpponents++;
    }
    
    // 如果没有对手，保持原评分
    if (totalOpponents === 0) {
      results.push({
        playerId: player.playerId,
        previousRating: player.currentRating,
        newRating: player.currentRating,
        ratingChange: 0,
      });
      continue;
    }
    
    // 计算平均期望得分和实际得分
    const avgExpectedScore = totalExpectedScore / totalOpponents;
    const avgActualScore = totalActualScore / totalOpponents;
    
    // 应用 ELO 公式
    const ratingChange = config.kFactor * (avgActualScore - avgExpectedScore);
    const newRating = Math.round(player.currentRating + ratingChange);
    
    results.push({
      playerId: player.playerId,
      previousRating: player.currentRating,
      newRating: Math.max(0, newRating), // 确保评分不会为负数
      ratingChange: Math.round(ratingChange),
    });
  }
  
  return results;
}

/**
 * 验证比赛结果的有效性
 * @param playerResults 玩家结果数组
 * @returns 验证结果和错误信息
 */
export function validateMatchResults(playerResults: Array<{ playerName: string; position: number }>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 检查是否至少有2名玩家
  if (playerResults.length < 2) {
    errors.push('至少需要2名玩家参与比赛');
  }
  
  // 检查玩家名称是否重复
  const playerNames = playerResults.map(p => p.playerName.trim().toLowerCase());
  const uniqueNames = new Set(playerNames);
  if (playerNames.length !== uniqueNames.size) {
    errors.push('玩家名称不能重复');
  }
  
  // 检查玩家名称是否为空
  const emptyNames = playerResults.filter(p => !p.playerName.trim());
  if (emptyNames.length > 0) {
    errors.push('玩家名称不能为空');
  }
  
  // 检查排名是否有效
  const positions = playerResults.map(p => p.position);
  const validPositions = positions.every(pos => pos >= 1 && pos <= playerResults.length);
  if (!validPositions) {
    errors.push('排名必须在1到参赛人数之间');
  }
  
  // 检查排名是否连续（允许并列）
  const sortedPositions = [...positions].sort((a, b) => a - b);
  const minPosition = Math.min(...positions);
  const maxPosition = Math.max(...positions);
  
  if (minPosition !== 1) {
    errors.push('排名必须从1开始');
  }
  
  // 检查是否有合理的排名分布
  const positionCounts = new Map<number, number>();
  positions.forEach(pos => {
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
  });
  
  // 验证排名的连续性（考虑并列情况）
  let expectedNextPosition = 1;
  for (let pos = 1; pos <= maxPosition; pos++) {
    const count = positionCounts.get(pos) || 0;
    if (count > 0) {
      if (pos !== expectedNextPosition) {
        errors.push('排名必须连续，不能跳跃');
        break;
      }
      expectedNextPosition = pos + count;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 计算胜率
 * @param wins 胜利次数
 * @param losses 失败次数
 * @param draws 平局次数
 * @returns 胜率百分比
 */
export function calculateWinRate(wins: number, losses: number, draws: number): number {
  const totalGames = wins + losses + draws;
  if (totalGames === 0) return 0;
  
  // 平局算作0.5分
  const totalPoints = wins + (draws * 0.5);
  return Math.round((totalPoints / totalGames) * 100);
}

/**
 * 根据评分计算等级
 * @param rating ELO评分
 * @returns 等级名称和颜色
 */
export function getRatingTier(rating: number): { name: string; color: string; minRating: number } {
  const tiers = [
    { name: '青铜', color: 'text-amber-600', minRating: 0 },
    { name: '白银', color: 'text-gray-500', minRating: 1200 },
    { name: '黄金', color: 'text-yellow-500', minRating: 1400 },
    { name: '铂金', color: 'text-cyan-500', minRating: 1600 },
    { name: '钻石', color: 'text-blue-500', minRating: 1800 },
    { name: '大师', color: 'text-purple-500', minRating: 2000 },
    { name: '宗师', color: 'text-red-500', minRating: 2200 },
  ];
  
  // 找到最高符合条件的等级
  let currentTier = tiers[0];
  for (const tier of tiers) {
    if (rating >= tier.minRating) {
      currentTier = tier;
    } else {
      break;
    }
  }
  
  return currentTier;
}