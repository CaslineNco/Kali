import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

/**
 * 「Break it down」：把一个时间块拆成几步可以直接动手的操作。
 * 直接从桌面端调 Claude API——key 只存在本机 SQLite 里，不经过任何中间服务器。
 * 这是用户主动开启的联网功能，不影响 PRD 4.4 的"数据纯本地"。
 */

export const API_KEY_SETTING = 'anthropic_api_key';

const StepsSchema = z.object({
  steps: z.array(z.string().min(1).max(120)).min(3).max(7),
});

export interface BreakdownInput {
  title: string;
  kind: 'focus' | 'fun';
  minutes: number;
  /** 已有的步骤，让模型在此基础上补，而不是从头来 */
  existing?: string[];
}

export class AiError extends Error {}

export async function breakDown(apiKey: string, input: BreakdownInput): Promise<string[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const system = [
    'You help someone who struggles to start a task because they do not know the first concrete move.',
    'Given a planned block of time, write 3–7 steps that are small, physical, unambiguous actions the person can begin within a minute.',
    'Rules: start with the very first action (open X, get Y, write one line); each step fits the time available; no motivational filler; no step longer than a short sentence; keep the language of the task title.',
  ].join(' ');

  const user = [
    `Task: ${input.title}`,
    `Type: ${input.kind === 'focus' ? 'focused work' : 'leisure'}`,
    `Time available: ${input.minutes} minutes`,
    input.existing?.length ? `Steps already written (keep the good ones, refine or extend): ${input.existing.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 2000,
      output_config: { effort: 'low', format: zodOutputFormat(StepsSchema) },
      system,
      messages: [{ role: 'user', content: user }],
    });
    if (response.stop_reason === 'refusal') throw new AiError('The model declined this request.');
    const parsed = response.parsed_output;
    if (!parsed) throw new AiError('Could not read the steps from the reply.');
    return parsed.steps.map((s) => s.trim()).filter(Boolean);
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new AiError('API key was rejected — check it in Settings.');
    if (err instanceof Anthropic.RateLimitError) throw new AiError('Rate limited — try again in a moment.');
    if (err instanceof Anthropic.APIConnectionError) throw new AiError('No connection to the API.');
    if (err instanceof Anthropic.APIError) throw new AiError(`API error ${err.status}: ${err.message}`);
    throw new AiError(err instanceof Error ? err.message : String(err));
  }
}
