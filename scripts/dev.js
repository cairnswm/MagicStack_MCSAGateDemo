// Starts the API (server/) and the web dev server (web/) together.
const { spawn } = require('child_process');

const procs = [
  { name: 'server', color: '\x1b[36m', cmd: 'npm --prefix server run dev' },
  { name: 'web', color: '\x1b[35m', cmd: 'npm --prefix web run dev' },
].map(({ name, color, cmd }) => {
  const p = spawn(cmd, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (d) =>
      out.write(d.toString().replace(/\r?\n$/, '').split(/\r?\n/).map((l) => prefix + l).join('\n') + '\n'));
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    console.log(`${prefix}exited (${code})`);
    shutdown();
  });
  return p;
});

let closing = false;
function shutdown() {
  if (closing) return;
  closing = true;
  for (const p of procs) {
    if (p.exitCode === null) {
      // taskkill /T also stops the child tree (nodemon/vite) on Windows
      spawn(`taskkill /pid ${p.pid} /T /F`, { shell: true, stdio: 'ignore' });
    }
  }
  setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
