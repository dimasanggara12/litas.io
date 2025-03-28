import fs from "fs/promises";
import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import readline from 'readline/promises';
import { TurnstileTask } from 'node-capmonster';
import { Solver } from "@2captcha/captcha-solver";
import bestcaptchasolver from 'bestcaptchasolver';
import chalk from 'chalk';

// Clear console and display new banner
console.clear();
console.log(chalk.blueBright(`
█████╗ ██╗   ██╗████████╗ ██████╗
██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗
███████║██║   ██║   ██║   ██║   ██║
██╔══██║██║   ██║   ██║   ██║   ██║
██║  ██║╚██████╔╝   ██║   ╚██████╔╝
╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝
`));
console.log(chalk.red('ＢＯＴ ') + chalk.yellow('ＡＵＴＯ ') + chalk.green('LITAS.IO'));
console.log(chalk.yellow('================================'));
console.log(chalk.cyan('Telegram: https://t.me/airdropfetchofficial'));
console.log(chalk.yellow('================================\n'));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const sitekey = "0x4AAAAAAA5ufO6a8DkJVX0v";

// Get captcha service and API key
console.log(chalk.yellow('\nPILIH LAYANAN CAPTCHA:'));
console.log(chalk.cyan('1. 2Captcha (rekomendasi)'));
console.log(chalk.cyan('2. Capmonster'));
console.log(chalk.cyan('3. CapResolve'));
console.log(chalk.cyan('4. Bestcaptchasolver'));

const type = await rl.question(chalk.yellow('Masukkan pilihan (1-4): '));
const apiKey = await rl.question(chalk.yellow('Masukkan API key: '));

async function solveCaptcha(pageurl, type) {
  try {
    if (type === "1") {
      console.log(chalk.yellow("Memecahkan captcha menggunakan 2Captcha..."));
      const solver = new Solver(apiKey);
      const result = (await solver.cloudflareTurnstile({ pageurl, sitekey })).data;
      console.log(chalk.green("✔ Captcha berhasil dipecahkan"));
      return result;
    }
    if (type === "2") {
      console.log(chalk.yellow("Memecahkan captcha menggunakan Capmonster..."));
      const capMonster = new TurnstileTask(apiKey);
      const task = capMonster.task({
        websiteKey: sitekey,
        websiteURL: pageurl
      });
      const taskId = await capMonster.createWithTask(task);
      const result = await capMonster.joinTaskResult(taskId);
      console.log(chalk.green("✔ Captcha berhasil dipecahkan"));
      return result.token;
    }
    if (type === "3") {
      console.log(chalk.yellow("Memecahkan captcha menggunakan CapResolve..."));
      const Solver = (await import("capsolver-npm")).Solver;
      const solver = new Solver({ apiKey });
      const token = await solver.turnstileproxyless({
        websiteURL: pageurl,
        websiteKey: sitekey,
      });
      console.log(chalk.green("✔ Captcha berhasil dipecahkan"));
      return token.token;
    }
    if (type === "4") {
      console.log(chalk.yellow("Memecahkan captcha menggunakan Bestcaptchasolver..."));
      bestcaptchasolver.set_access_token(apiKey);
      const id = await bestcaptchasolver.submit_turnstile({
        page_url: pageurl,
        site_key: sitekey,
      });
      const token = await bestcaptchasolver.retrieve_captcha(id);
      console.log(chalk.green("✔ Captcha berhasil dipecahkan"));
      return token.solution;
    }
  } catch (error) {
    console.log(chalk.red(`✖ Gagal memecahkan captcha: ${error.message}`));
    return null;
  }
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  Accept: "application/json",
};

async function getInfo(token, agent) {
  try {
    const headerInfo = {
      ...headers,
      authorization: `Bearer ${token.trim()}`,
      referer: "https://wallet.litas.io/miner"
    };
    
    const options = {
      method: "GET",
      headers: headerInfo,
      agent
    };

    const [userResponse, balanceResponse] = await Promise.all([
      fetch("https://wallet.litas.io/api/v1/users/current-user", options),
      fetch("https://wallet.litas.io/api/v1/users/current-user/balances", options)
    ]);

    const user = await userResponse.json().catch(() => null);
    const balance = await balanceResponse.json().catch(() => null);

    if (!user || !balance) {
      throw new Error("Gagal mendapatkan info akun");
    }

    return { user, balance };
  } catch (error) {
    console.log(chalk.red(`✖ Gagal mendapatkan info akun: ${error.message}`));
    return { user: null, balance: null };
  }
}

async function login(body, agent, xtoken, cookie) {
  try {
    const headerInfo = {
      ...headers,
      "Accept-Encoding": "gzip, deflate, br",
      "X-CSRF-TOKEN": xtoken,
      Referer: "https://wallet.litas.io/login",
      "Content-Type": "application/json",
      Cookie: cookie,
    };

    const captchaToken = await solveCaptcha("https://wallet.litas.io/login", type);
    if (!captchaToken) {
      throw new Error("Gagal mendapatkan token captcha");
    }

    const options = {
      method: "POST",
      headers: headerInfo,
      agent,
      body: JSON.stringify({
        emailOrUserName: body.username,
        password: body.password,
        rememberMe: true,
        reCaptchaResponse: captchaToken,
      }),
    };

    const response = await fetch("https://wallet.litas.io/api/v1/auth/login", options);
    const rs = await response.json().catch(() => null);

    if (!rs || !rs.accessToken) {
      throw new Error("Email atau password salah");
    }

    console.log(chalk.green("✔ Login berhasil"));
    return { accessToken: rs.accessToken };
  } catch (error) {
    console.log(chalk.red(`✖ Login gagal: ${error.message}`));
    return { accessToken: null };
  }
}

async function getXToken(token = '', agent) {
  try {
    const headerInfo = {
      ...headers,
      Referer: token ? "https://wallet.litas.io/miner" : "https://wallet.litas.io/login",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      Authorization: token ? `Bearer ${token.trim()}` : ""
    };

    const options = {
      method: "GET",
      headers: headerInfo,
      agent,
      credentials: "include",
    };

    const response = await fetch("https://wallet.litas.io/api/v1/antiforgery/token", options);
    const cookies = response.headers.get("Set-Cookie");
    const data = await response.json().catch(() => null);

    if (!data || !data.token || !cookies) {
      throw new Error("Token tidak valid");
    }

    console.log(chalk.green("✔ Token berhasil didapatkan"));
    return { xtoken: data.token, cookie: cookies.split(";")[0].trim() };
  } catch (error) {
    console.log(chalk.red(`✖ Gagal mendapatkan token: ${error.message}`));
    return { xtoken: null, cookie: null };
  }
}

async function minerClaim(token, xtoken, agent, refCode, cookie) {
  try {
    const headerInfo = {
      ...headers,
      authorization: `Bearer ${token.trim()}`,
      "Accept-Encoding": "gzip, deflate, br",
      "X-CSRF-TOKEN": xtoken,
      "IDEMPOTENCY-KEY": refCode,
      Referer: "https://wallet.litas.io/miner",
      Cookie: cookie,
    };

    const options = {
      method: "PATCH",
      headers: headerInfo,
      agent,
    };

    const response = await fetch("https://wallet.litas.io/api/v1/miner/claim", options);
    
    if (response.status === 204) {
      console.log(chalk.green("✔ Claim berhasil"));
      return "✔ Claim berhasil";
    }

    const rs = await response.json().catch(() => ({}));
    throw new Error(rs?.errors?.[0]?.message || "Gagal melakukan claim");
  } catch (error) {
    console.log(chalk.red(`✖ ${error.message}`));
    return `✖ ${error.message}`;
  }
}

async function readFiles() {
  try {
    const [proxyStr, accountStr] = await Promise.all([
      fs.readFile("proxies.txt", "utf-8").catch(() => ""),
      fs.readFile("accounts.txt", "utf-8")
    ]);

    const proxies = proxyStr.trim().split("\n").filter(p => p.trim());
    const accounts = accountStr.trim().split("\n").filter(a => a.trim());

    if (accounts.length === 0) {
      throw new Error("Tidak ada akun yang ditemukan");
    }

    console.log(chalk.green(`✔ Ditemukan ${accounts.length} akun`));
    return { proxies, accounts };
  } catch (error) {
    console.log(chalk.red(`✖ ${error.message}`));
    process.exit(1);
  }
}

async function update(token, xtoken, agent, cookie, refCode) {
  try {
    const headerInfo = {
      ...headers,
      authorization: `Bearer ${token.trim()}`,
      "Accept-Encoding": "gzip, deflate, br",
      "X-CSRF-TOKEN": xtoken,
      "IDEMPOTENCY-KEY": refCode,
      Referer: "https://wallet.litas.io/miner",
      Cookie: cookie,
      Accept: "application/json"
    };

    const options = {
      method: "PATCH",
      headers: headerInfo,
      agent,
    };

    const response = await fetch("https://wallet.litas.io/api/v1/miner/upgrade/speed", options);
    
    if (response.status === 204) {
      console.log(chalk.green("✔ Upgrade berhasil"));
      return "✔ Upgrade berhasil";
    }

    const rs = await response.json().catch(() => ({}));
    throw new Error(rs?.errors?.[0]?.message || "Gagal melakukan upgrade");
  } catch (error) {
    console.log(chalk.red(`✖ ${error.message}`));
    return `✖ ${error.message}`;
  }
}

async function main() {
  while (true) {
    const { proxies, accounts } = await readFiles();
    console.log(chalk.magenta('\n' + '='.repeat(50)));
    console.log(chalk.blueBright('MEMULAI PROSES MINING LITAS.IO'));
    console.log(chalk.magenta('='.repeat(50) + '\n'));

    for (let i = 0; i < accounts.length; i++) {
      try {
        console.log(chalk.yellow(`\n🔹 Memproses akun ${i + 1}/${accounts.length}`));
        
        const proxy = proxies[i]?.trim();
        const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
        
        if (proxy) {
          console.log(chalk.cyan(`🔌 Menggunakan proxy: ${proxy}`));
        } else {
          console.log(chalk.yellow('⚠ Menjalankan tanpa proxy'));
        }

        const [email, password] = accounts[i].split(",").map(s => s.trim());
        console.log(chalk.cyan(`📧 Email: ${email}`));

        const xtokenLogin = await getXToken('', agent);
        const { accessToken } = await login(
          { username: email, password },
          agent,
          xtokenLogin.xtoken,
          xtokenLogin.cookie
        );

        if (!accessToken) continue;

        const { user, balance } = await getInfo(accessToken, agent);
        if (!user || !balance) continue;

        console.log(chalk.green(`👤 Nickname: ${user.nickName}`));
        console.log(chalk.green(`💰 Balance: ${JSON.stringify(balance)}`));

        const { xtoken, cookie } = await getXToken(accessToken, agent);
        const claimResult = await minerClaim(
          accessToken,
          xtoken,
          agent,
          user.nickName,
          cookie
        );

        if (claimResult.includes('Not enough balance')) {
          console.log(chalk.yellow('⚡ Mencoba upgrade miner...'));
          const xupdate = await getXToken(accessToken, agent);
          await update(accessToken, xupdate.xtoken, agent, xupdate.cookie, user.nickName);
          const claimAgain = await minerClaim(
            accessToken,
            xtoken,
            agent,
            user.nickName,
            cookie
          );
          console.log(claimAgain);
        }

        console.log(chalk.greenBright(`✅ Akun ${i + 1} selesai diproses`));
      } catch (error) {
        console.error(chalk.red(`❌ Error pada akun ${i + 1}: ${error.message}`));
      }
      console.log(chalk.gray('-'.repeat(50)));
    }

    console.log(chalk.yellow('\n⏳ Menunggu 3 jam sebelum eksekusi berikutnya...'));
    await new Promise(resolve => setTimeout(resolve, 3 * 60 * 60 * 1000));
  }
}

main().catch(error => {
  console.error(chalk.red('❌ Error utama:'), error);
  process.exit(1);
});
