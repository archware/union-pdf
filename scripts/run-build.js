import { spawnSync } from 'node:child_process';
import { platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWin = platform() === 'win32';

let result;
if (isWin) {
  result = spawnSync(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'verificar-todo.ps1')],
    {
      stdio: 'inherit',
      cwd: root,
    }
  );
} else {
  result = spawnSync('bash', [join(root, 'scripts', 'verificar-todo.sh')], {
    stdio: 'inherit',
    cwd: root,
  });
}

process.exit(result.status ?? 1);
