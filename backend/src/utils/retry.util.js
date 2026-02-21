async function withRetry(fn, options = {}) {
  const { maxRetries = 2, delayMs = 1000 } = options;
  let lastError;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return { success: true, retryCount, result };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        retryCount++;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  return { success: false, retryCount, error: lastError };
}

module.exports = { withRetry };
