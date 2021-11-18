import os from 'https://deno.land/x/dos@v0.11.0/mod.ts';
import { ensureDir } from 'https://deno.land/std@0.106.0/fs/mod.ts';
import { readLines } from 'https://deno.land/std@0.79.0/io/bufio.ts';
import EventEmitter from 'https://deno.land/std@0.79.0/node/events.ts';
import * as path from 'https://deno.land/std/path/mod.ts';
import { Command } from 'https://deno.land/x/cliffy/command/mod.ts';
import { StringResponse } from '../../tools/string-response.ts';
import { LetheanWalletVpnRpc } from './lethean-wallet-vpn-rpc.ts';
import { LetheanWalletCli } from './lethean-wallet-cli.ts';

export class stdOutStream extends EventEmitter {
  constructor() {
    super();
  }

  public async run(...command: Array<string>): Promise<void> {
    const p = Deno.run({
      cmd: command,
      stderr: 'piped',
      stdout: 'piped',
    });
    for await (const line of readLines(p.stdout)) {
      if (line.trim()) {
        super.emit('stdout', line);
      }
    }
    for await (const line of readLines(p.stderr)) {
      if (line.trim()) {
        super.emit('stderr', line);
      }
    }
    super.emit('end', await p.status());
    p.close();
    return;
  }
}

export class LetheanWalletRpc {
  private static command: any;
  private static exeFile: string;
  private static debug = 1;
  private static process: stdOutStream;

  static run(args: any) {
    const homeDir = os.homeDir();

    this.exeFile = 'lethean-wallet-rpc' +
      (os.platform() === 'windows' ? '.exe' : '');
    LetheanWalletRpc.command = path.join(
      homeDir ? homeDir : './',
      'Lethean',
      'cli',
      this.exeFile,
    );

    LetheanWalletRpc.process = new stdOutStream();
    const cmdArgs: any = [];

    for (const arg in args) {
      if (arg !== 'igd') {
        const value = args[arg].length > 1 ? `=${args[arg]}` : '';
        cmdArgs.push(
          '--' + arg.replace(/([A-Z])/g, (x) => '-' + x.toLowerCase()) + value,
        );
      }
    }

    //return ensureDir(args['dataDir']).then(async () => {
    console.log(LetheanWalletRpc.command, cmdArgs);
    return LetheanWalletRpc.process.on('stdout', (stdout) => {
      console.log(stdout);
    }).on('stderr', (stderr) => {
      console.log(stderr);
    }).run(this.command, ...cmdArgs);

    //});
  }

  public static config() {
    const home = os.homeDir();

    return new Command()
      .command('cli', LetheanWalletCli.config())
      .command('vpn', LetheanWalletVpnRpc.config())
      .command('rpc')
      .description('Wallet RPC')
      .option('--daemon-address <string>', 'Use daemon instance at <host>:<port>')
      .option('--daemon-host <string>', 'Use daemon instance at host <arg> instead of localhost')
      .option('--password <string>', 'Wallet password (escape/quote as needed)')
      .option('--password-file <string>', 'Wallet password file')
      .option('--daemon-port <string>', 'Use daemon instance at port <arg> instead of 48782')
      .option('--daemon-login <string>', 'Specify username[:password] for daemon RPC client')
      .option('--testnet', 'For testnet. Daemon must also be launched with --testnet flag')
      .option('--restricted-rpc ', 'Restricts to view-only commands')
      .option('--rpc-bind-port  <string>', 'Sets bind port for server')
      .option('--disable-rpc-login', 'Disable HTTP authentication for RPC connections served by this process')
      .option('--trusted-daemon', 'Enable commands which rely on a trusted daemon')
      .option('--rpc-bind-ip  <string>', 'Specify ip to bind rpc server')
      .option('--rpc-login  <string>', 'Specify username[:password] required for RPC server')
      .option('--confirm-external-bind  <string>', 'Confirm rpc-bind-ip value is NOT a loopback (local) IP')
      .option('--wallet-file  <string>', 'Use wallet')
      .option('--generate-from-json  <string>', 'Generate wallet from JSON format file')
      .option('--wallet-dir  <string>', 'Directory for newly created wallets', {default: path.join(home ? home : '/', 'Lethean', 'wallets')})
      .option('--log-file  <string>', 'Specify log file')
      .option('--log-level  <string>', '0-4 or categories')
      .option('--max-concurrency  <string>', 'Max number of threads to use for a parallel job')
      .option('--config-file  <string>', 'Config file')
      .action((args) => {
        LetheanWalletRpc.run(args);
        if (Deno.env.get('REST')) {
          throw new StringResponse('Started');
        }
      });
  }
}
