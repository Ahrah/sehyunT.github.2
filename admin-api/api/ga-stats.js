import { handleRequest, readConfig } from '../lib/ga-stats.js';
import { verifyFirebaseIdToken, runBatchReport } from '../lib/deps.js';

const cache = { value: null, expiresAt: 0 };

export default async function handler(req, res) {
  const result = await handleRequest(
    { method: req.method, origin: req.headers.origin, authorization: req.headers.authorization },
    readConfig(process.env),
    { verifyIdToken: verifyFirebaseIdToken, runBatchReport, now: () => Date.now(), cache, log: console.warn },
  );
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.status(result.status).send(result.body);
}
