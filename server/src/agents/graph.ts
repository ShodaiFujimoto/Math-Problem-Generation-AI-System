import { MathProblemState } from './types';
import {
  runProblemGenerationAgent,
  runTexFormatAgent,
  runPDFGenerationAgent
} from './agents';
import { runSlotFillingAgent } from './agents/slotFillingAgent';
import { runSolutionVerificationAgent } from './agents/solutionVerificationAgent';

// 問題修正エージェント
const problemRevisionAgent = async (state: MathProblemState): Promise<MathProblemState> => {
  // 問題修正のロジックを実装
  // 現在は簡易的な実装として、問題をそのまま返す
  return {
    ...state,
    status: 'problem_revised'
  };
};

// シンプルなシーケンシャルエージェントチェーン
class SimpleSequentialChain {
  private agents: ((state: MathProblemState) => Promise<MathProblemState>)[];

  constructor() {
    this.agents = [];
  }

  addAgent(agent: (state: MathProblemState) => Promise<MathProblemState>) {
    this.agents.push(agent);
    return this;
  }

  // シンプルな条件付き実行のためのヘルパー関数
  addConditionalAgent(
    conditionFn: (state: MathProblemState) => boolean,
    trueAgent: (state: MathProblemState) => Promise<MathProblemState>,
    falseAgent: (state: MathProblemState) => Promise<MathProblemState>
  ) {
    const conditionalAgent = async (state: MathProblemState): Promise<MathProblemState> => {
      if (conditionFn(state)) {
        return await trueAgent(state);
      } else {
        return await falseAgent(state);
      }
    };
    
    this.agents.push(conditionalAgent);
    return this;
  }

  // チェーンを実行する
  async run(initialState: MathProblemState): Promise<MathProblemState> {
    let currentState = { ...initialState };
    
    for (const agent of this.agents) {
      try {
        currentState = await agent(currentState);
      } catch (error) {
        console.error('エージェント実行中にエラーが発生しました:', error);
        return {
          ...currentState,
          status: 'error',
          verification_result: {
            is_valid: false,
            feedback: `エラーが発生しました: ${error}`,
            suggestions: ['システム管理者に連絡してください']
          }
        };
      }
    }
    
    return currentState;
  }
}

// シンプルなエージェントチェーンの構築
export const buildAgentChain = () => {
  const chain = new SimpleSequentialChain();
  
  // エージェントの追加
  chain
    .addAgent(runSlotFillingAgent)
    .addAgent(runProblemGenerationAgent)
    .addAgent(runSolutionVerificationAgent)
    .addConditionalAgent(
      (state) => state.verification_result.is_valid,
      runTexFormatAgent,
      problemRevisionAgent
    )
    .addAgent(runPDFGenerationAgent);
  
  return chain;
};

// エージェントチェーンのインスタンスを作成
export const agentChain = buildAgentChain(); 