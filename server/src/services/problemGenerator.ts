import OpenAI from 'openai';
import { Problem } from '../types/problem';

export class ProblemGenerator {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async generateProblem(difficulty: string, topic: string): Promise<Problem> {
    const prompt = this.generatePrompt(difficulty, topic);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const generatedText = response.choices[0].message.content || '';
      return this.parseGeneratedText(generatedText, difficulty, topic);
    } catch (error) {
      console.error('Error generating problem:', error);
      throw new Error('Failed to generate problem');
    }
  }

  private generatePrompt(difficulty: string, topic: string): string {
    return `Generate a ${difficulty} level mathematics problem about ${topic}.
    Format the response as follows:
    Question: [The problem statement]
    Answer: [The solution]
    Explanation: [Detailed explanation of the solution]`;
  }

  private parseGeneratedText(text: string, difficulty: string, topic: string): Problem {
    const lines = text.split('\n');
    let question = '';
    let answer = '';
    let explanation = '';

    for (const line of lines) {
      if (line.startsWith('Question:')) {
        question = line.replace('Question:', '').trim();
      } else if (line.startsWith('Answer:')) {
        answer = line.replace('Answer:', '').trim();
      } else if (line.startsWith('Explanation:')) {
        explanation = line.replace('Explanation:', '').trim();
      }
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      question,
      answer,
      explanation,
      difficulty,
      topic,
      createdAt: new Date(),
    };
  }
} 