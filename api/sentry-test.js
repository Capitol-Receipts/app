/* Throws a deliberate error so we can check that server errors reach Sentry with the right release.
   Works only on preview deploys (VERCEL_ENV=preview), which sit behind Vercel's sign-in; production answers 404. */
const { watch } = require('./_watch');

module.exports = watch(async (req, res) => {
  if (process.env.VERCEL_ENV !== 'preview') return res.status(404).json({ error: 'not found' });
  throw new Error(`Sentry server test error (release ${process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'}), safe to ignore`);
});
