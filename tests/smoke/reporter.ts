import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

class SmokeReporter implements Reporter {
  private passes = 0;
  private fails = 0;
  private skips = 0;
  private hasCriticalFailures = 0;

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') {
      this.passes++;
      console.log(`PASS - ${test.title}`);
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      this.fails++;
      this.hasCriticalFailures++;
      console.log(`FAIL - ${test.title}`);
      console.log(`       Error: ${result.error?.message?.split('\n')[0]}`);
    } else if (result.status === 'skipped') {
      this.skips++;
      console.log(`SKIPPED - ${test.title}`);
    }
  }

  onEnd(result: FullResult) {
    console.log(`\nTotal passed: ${this.passes}`);
    console.log(`Total failed: ${this.fails}`);
    console.log(`Total skipped: ${this.skips}`);
    const safeToContinue = this.hasCriticalFailures === 0 && this.passes > 0 ? 'YES' : 'NO';
    console.log(`Safe to continue: ${safeToContinue}`);
  }
}

export default SmokeReporter;
