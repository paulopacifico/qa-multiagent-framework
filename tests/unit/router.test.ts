import { resolveAgent } from '../../src/orchestrator/router';
import { runQaSpecAgent } from '../../src/agents/qa-spec';
import { runQaPlanAgent } from '../../src/agents/qa-plan';
import { runQaCodeAgent } from '../../src/agents/qa-code';
import { runQaCiAgent } from '../../src/agents/qa-ci';

describe('Phase Router', () => {
  it('resolves "spec" phase to the QA-Spec agent function', () => {
    expect(resolveAgent('spec')).toBe(runQaSpecAgent);
  });

  it('resolves "plan" phase to the QA-Plan agent function', () => {
    expect(resolveAgent('plan')).toBe(runQaPlanAgent);
  });

  it('resolves "code" phase to the QA-Code agent function', () => {
    expect(resolveAgent('code')).toBe(runQaCodeAgent);
  });

  it('resolves "ci" phase to the QA-CI agent function', () => {
    expect(resolveAgent('ci')).toBe(runQaCiAgent);
  });

  it('throws an error for an unknown phase', () => {
    expect(() => resolveAgent('deploy' as never)).toThrow('Unknown phase: deploy');
  });
});
