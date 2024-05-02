const fs = require("fs");
const fuzzysort = require("fuzzysort");
const { DEFAULT_VALORANT_LANG, discToValLang } = require("./languages");
const { PermissionsBitField } = require("discord");

/** JSON format:
 * {
 *     accounts: [User objects],
 *     currentAccount: currently selected account, 1 for first account,
 *     settings: dictionary
 * }
 */

function readUserJson(id) {
  try {
    return JSON.parse(fs.readFileSync("data/users/" + id + ".json", "utf-8"));
  } catch (e) {
    return null;
  }
}

function getUserJson(id, account = null) {
  const user = readUserJson(id);
  if (!user) return null;

  if (!user.accounts) {
    const userJson = {
      accounts: [user],
      currentAccount: 1,
      settings: defaultSettings,
    };
    saveUserJson(id, userJson);
    return userJson.accounts[account || 1];
  }

  account = account || user.currentAccount || 1;
  if (account > user.accounts.length) account = 1;
  return user.accounts[account - 1];
}

function saveUserJson(id, json) {
  ensureUsersFolder();
  fs.writeFileSync("data/users/" + id + ".json", JSON.stringify(json, null, 2));
}

function saveUser(user, account = null) {
  if (!fs.existsSync("data/users")) fs.mkdirSync("data/users");

  const userJson = readUserJson(user.id);
  if (!userJson) {
    const objectToWrite = {
      accounts: [user],
      currentAccount: 1,
      settings: defaultSettings,
    };
    saveUserJson(user.id, objectToWrite);
  } else {
    if (!account)
      account =
        userJson.accounts.findIndex((a) => a.puuid === user.puuid) + 1 ||
        userJson.currentAccount;
    if (account > userJson.accounts.length) account = userJson.accounts.length;

    userJson.accounts[(account || userJson.currentAccount) - 1] = user;
    saveUserJson(user.id, userJson);
  }
}

function addUser(user) {
  const userJson = readUserJson(user.id);
  if (userJson) {
    // check for duplicate accounts
    let foundDuplicate = false;
    for (let i = 0; i < userJson.accounts.length; i++) {
      if (userJson.accounts[i].puuid === user.puuid) {
        const oldUser = userJson.accounts[i];

        // merge the accounts
        userJson.accounts[i] = user;
        userJson.currentAccount = i + 1;

        // copy over data from old account
        user.alerts = removeDupeAlerts(
          oldUser.alerts.concat(userJson.accounts[i].alerts)
        );
        user.lastFetchedData = oldUser.lastFetchedData;
        user.lastNoticeSeen = oldUser.lastNoticeSeen;
        user.lastSawEasterEgg = oldUser.lastSawEasterEgg;

        foundDuplicate = true;
      }
    }

    if (!foundDuplicate) {
      userJson.accounts.push(user);
      userJson.currentAccount = userJson.accounts.length;
    }

    saveUserJson(user.id, userJson);
  } else {
    const objectToWrite = {
      accounts: [user],
      currentAccount: 1,
      settings: defaultSettings,
    };
    saveUserJson(user.id, objectToWrite);
  }
}

function deleteUser(id, accountNumber) {
  const userJson = readUserJson(id);
  if (!userJson) return;

  const indexToDelete = (accountNumber || userJson.currentAccount) - 1;
  const userToDelete = userJson.accounts[indexToDelete];

  userJson.accounts.splice(indexToDelete, 1);
  if (userJson.accounts.length === 0)
    fs.unlinkSync("data/users/" + id + ".json");
  else if (userJson.currentAccount > userJson.accounts.length)
    userJson.currentAccount = userJson.accounts.length;

  saveUserJson(id, userJson);

  return userToDelete.username;
}

function deleteWholeUser(id) {
  if (!fs.existsSync("data/users")) return;

  // get the user's PUUIDs to delete the shop cache
  const data = readUserJson(id);
  if (data) {
    const puuids = data.accounts.map((a) => a.puuid);
    for (const puuid of puuids) {
      try {
        fs.unlinkSync(`data/shopCache/${puuid}.json`);
      } catch (e) {}
    }
  }

  fs.unlinkSync("data/users/" + id + ".json");
}

function getNumberOfAccounts(id) {
  const user = readUserJson(id);
  if (!user) return 0;
  return user.accounts.length;
}

function switchAccount(id, accountNumber) {
  const userJson = readUserJson(id);
  if (!userJson) return;
  userJson.currentAccount = accountNumber;
  saveUserJson(id, userJson);
  return userJson.accounts[accountNumber - 1];
}

function getAccountWithPuuid(id, puuid) {
  const userJson = readUserJson(id);
  if (!userJson) return null;
  return userJson.accounts.find((a) => a.puuid === puuid);
}

function findTargetAccountIndex(id, query) {
  const userJson = readUserJson(id);
  if (!userJson) return null;

  let index = userJson.accounts.findIndex(
    (a) => a.username === query || a.puuid === query
  );
  if (index !== -1) return index + 1;

  return parseInt(query) || null;
}

function removeDupeAccounts(id, json = readUserJson(id)) {
  const accounts = json.accounts;
  const newAccounts = [];
  for (let i = 0; i < accounts.length; i++) {
    const existingAccount = newAccounts.find(
      (a) => a.puuid === accounts[i].puuid
    );
    if (!existingAccount) newAccounts.push(accounts[i]);
    else
      existingAccount.alerts = removeDupeAlerts(
        existingAccount.alerts.concat(accounts[i].alerts)
      );
  }

  if (accounts.length !== newAccounts.length) {
    json.accounts = newAccounts;
    saveUserJson(id, json);
  }

  return json;
}

class User {
  constructor({
    id,
    puuid,
    auth,
    alerts = [],
    username,
    region,
    authFailures,
    lastFetchedData,
    lastNoticeSeen,
    lastSawEasterEgg,
  }) {
    this.id = id;
    this.puuid = puuid;
    this.auth = auth;
    this.alerts = alerts || [];
    this.username = username;
    this.region = region;
    c;
    this.authFailures = authFailures || 0;
    this.lastFetchedData = lastFetchedData || 0;
    this.lastNoticeSeen = lastNoticeSeen || "";
    this.lastSawEasterEgg = lastSawEasterEgg || 0;
  }
}

function transferUserDataFromOldUsersJson() {
  if (!fs.existsSync("data/users.json")) return;

  console.log("Transferring user data from users.json to the new format...");
  console.log(
    "(The users.json file will be backed up as users.json.old, just in case)"
  );

  const usersJson = JSON.parse(fs.readFileSync("data/users.json", "utf-8"));

  const alertsArray = fs.existsSync("data/alerts.json")
    ? JSON.parse(fs.readFileSync("data/alerts.json", "utf-8"))
    : [];
  const alertsForUser = (id) => alertsArray.filter((a) => a.id === id);

  for (const id in usersJson) {
    const userData = usersJson[id];
    const user = new User({
      id: id,
      puuid: userData.puuid,
      auth: {
        rso: userData.rso,
        idt: userData.idt,
        ent: userData.ent,
        cookies: userData.cookies,
      },
      alerts: alertsForUser(id).map((alert) => {
        return { uuid: alert.uuid, channel_id: alert.channel_id };
      }),
      username: userData.username,
      region: userData.region,
    });
    saveUser(user);
  }
  fs.renameSync("data/users.json", "data/users.json.old");
}

function getUser(id, account = null) {
  if (id instanceof User) {
    const user = id;
    const userJson = readUserJson(user.id);
    if (!userJson) return null;

    const userData = userJson.accounts.find((a) => a.puuid === user.puuid);
    return userData && new User(userData);
  }

  try {
    const userData = getUserJson(id, account);
    return userData && new User(userData);
  } catch (e) {
    return null;
  }
}

const userFilenameRegex = /\d+\.json/;
function getUserList() {
  ensureUsersFolder();
  return fs
    .readdirSync("data/users")
    .filter((filename) => userFilenameRegex.test(filename))
    .map((filename) => filename.replace(".json", ""));
}

async function authUser(id, account = null) {
  // doesn't check if token is valid, only checks it hasn't expired
  const user = getUser(id, account);
  if (!user || !user.auth || !user.auth.rso) return { success: false };

  const rsoExpiry = tokenExpiry(user.auth.rso);
  if (rsoExpiry - Date.now() > 10_000) return { success: true };

  return await refreshToken(id, account);
}

async function redeemUsernamePassword(id, login, password) {
  let rateLimit = isRateLimited("auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  const proxyManager = getProxyManager();
  const proxy = await proxyManager.getProxy("auth.riotgames.com");
  const agent = await proxy?.createAgent("auth.riotgames.com");

  // prepare cookies for auth request
  const req1 = await fetch("https://auth.riotgames.com/api/v1/authorization", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user-agent": await getUserAgent(),
    },
    body: JSON.stringify({
      client_id: "riot-client",
      code_challenge: "",
      code_challenge_method: "",
      acr_values: "",
      claims: "",
      nonce: "69420",
      redirect_uri: "http://localhost/redirect",
      response_type: "token id_token",
      scope: "openid link ban lol_region",
    }),
    proxy: agent,
  });
  console.assert(
    req1.statusCode === 200,
    `Auth Request Cookies status code is ${req1.statusCode}!`,
    req1
  );

  rateLimit = checkRateLimit(req1, "auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  if (detectCloudflareBlock(req1))
    return { success: false, rateLimit: "cloudflare" };

  let cookies = parseSetCookie(req1.headers["set-cookie"]);

  // get access token
  const req2 = await fetch("https://auth.riotgames.com/api/v1/authorization", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "user-agent": await getUserAgent(),
      cookie: stringifyCookies(cookies),
    },
    body: JSON.stringify({
      type: "auth",
      username: login,
      password: password,
      remember: true,
    }),
    proxy: agent,
  });
  console.assert(
    req2.statusCode === 200,
    `Auth status code is ${req2.statusCode}!`,
    req2
  );

  rateLimit = checkRateLimit(req2, "auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  if (detectCloudflareBlock(req2))
    return { success: false, rateLimit: "cloudflare" };

  cookies = {
    ...cookies,
    ...parseSetCookie(req2.headers["set-cookie"]),
  };

  const json2 = JSON.parse(req2.body);
  if (json2.type === "error") {
    if (json2.error === "auth_failure")
      console.error("Authentication failure!", json2);
    else console.error("Unknown auth error!", JSON.stringify(json2, null, 2));
    return { success: false };
  }

  if (json2.type === "response") {
    const user = await processAuthResponse(
      id,
      { login, password, cookies },
      json2.response.parameters.uri
    );
    addUser(user);
    return { success: true };
  } else if (json2.type === "multifactor") {
    // 2FA
    const user = new User({ id });
    user.auth = {
      ...user.auth,
      waiting2FA: Date.now(),
      cookies: cookies,
    };

    user.auth.login = login;
    user.auth.password = btoa(password);

    addUser(user);
    return {
      success: false,
      mfa: true,
      method: json2.multifactor.method,
      email: json2.multifactor.email,
    };
  }

  return { success: false };
}

async function redeem2FACode(id, code) {
  let rateLimit = isRateLimited("auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  let user = getUser(id);

  const req = await fetch("https://auth.riotgames.com/api/v1/authorization", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "user-agent": await getUserAgent(),
      cookie: stringifyCookies(user.auth.cookies),
    },
    body: JSON.stringify({
      type: "multifactor",
      code: code.toString(),
      rememberDevice: true,
    }),
  });
  console.assert(
    req.statusCode === 200,
    `2FA status code is ${req.statusCode}!`,
    req
  );

  rateLimit = checkRateLimit(req, "auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  deleteUser(id);

  user.auth = {
    ...user.auth,
    cookies: {
      ...user.auth.cookies,
      ...parseSetCookie(req.headers["set-cookie"]),
    },
  };

  const json = JSON.parse(req.body);
  if (json.error === "multifactor_attempt_failed" || json.type === "error") {
    console.error("Authentication failure!", json);
    return { success: false };
  }

  user = await processAuthResponse(
    id,
    {
      login: user.auth.login,
      password: atob(user.auth.password || ""),
      cookies: user.auth.cookies,
    },
    json.response.parameters.uri,
    user
  );

  delete user.auth.waiting2FA;
  addUser(user);

  return { success: true };
}

async function processAuthResponse(id, authData, redirect, user = null) {
  if (!user) user = new User({ id });
  const [rso, idt] = extractTokensFromUri(redirect);
  if (rso == null) {
    console.error("Riot servers didn't return an RSO token!");
    console.error(
      "Most likely the Cloudflare firewall is blocking your IP address. Try hosting on your home PC and seeing if the issue still happens."
    );
    throw "Riot servers didn't return an RSO token!";
  }

  user.auth = {
    ...user.auth,
    rso: rso,
    idt: idt,
  };

  // save either cookies or login/password
  if (authData.login && !user.auth.waiting2FA) {
    // don't store login/password for people with 2FA
    user.auth.login = authData.login;
    user.auth.password = btoa(authData.password);
    delete user.auth.cookies;
  } else {
    user.auth.cookies = authData.cookies;
    delete user.auth.login;
    delete user.auth.password;
  }

  user.puuid = decodeToken(rso).sub;

  const existingAccount = getAccountWithPuuid(id, user.puuid);
  if (existingAccount) {
    user.username = existingAccount.username;
    user.region = existingAccount.region;
    if (existingAccount.auth) user.auth.ent = existingAccount.auth.ent;
  }

  // get username
  const userInfo = await getUserInfo(user);
  user.username = userInfo.username;

  // get entitlements token
  if (!user.auth.ent) user.auth.ent = await getEntitlements(user);

  // get region
  if (!user.region) user.region = await getRegion(user);

  user.lastFetchedData = Date.now();

  user.authFailures = 0;
  return user;
}

async function getUserInfo(user) {
  const req = await fetch("https://auth.riotgames.com/userinfo", {
    headers: {
      Authorization: "Bearer " + user.auth.rso,
    },
  });
  console.assert(
    req.statusCode === 200,
    `User info status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  if (json.acct)
    return {
      puuid: json.sub,
      username:
        json.acct.game_name && json.acct.game_name + "#" + json.acct.tag_line,
    };
}

async function getEntitlements(user) {
  const req = await fetch(
    "https://entitlements.auth.riotgames.com/api/token/v1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + user.auth.rso,
      },
    }
  );
  console.assert(
    req.statusCode === 200,
    `Auth status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  return json.entitlements_token;
}

async function getRegion(user) {
  const req = await fetch(
    "https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + user.auth.rso,
      },
      body: JSON.stringify({
        id_token: user.auth.idt,
      }),
    }
  );
  console.assert(
    req.statusCode === 200,
    `PAS token status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  return json.affinities.live;
}

async function redeemCookies(id, cookies) {
  let rateLimit = isRateLimited("auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  const req = await fetch(
    "https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1",
    {
      headers: {
        "user-agent": await getUserAgent(),
        cookie: cookies,
      },
    }
  );
  console.assert(
    req.statusCode === 303,
    `Cookie Reauth status code is ${req.statusCode}!`,
    req
  );

  rateLimit = checkRateLimit(req, "auth.riotgames.com");
  if (rateLimit) return { success: false, rateLimit: rateLimit };

  if (detectCloudflareBlock(req))
    return { success: false, rateLimit: "cloudflare" };

  if (req.headers.location.startsWith("/login")) return { success: false }; // invalid cookies

  cookies = {
    ...parseSetCookie(cookies),
    ...parseSetCookie(req.headers["set-cookie"]),
  };

  const user = await processAuthResponse(id, { cookies }, req.headers.location);
  addUser(user);

  return { success: true };
}

async function refreshToken(id, account = null) {
  console.log(`Refreshing token for ${id}...`);
  let response = { success: false };

  let user = getUser(id, account);
  if (!user) return response;

  if (user.auth.cookies) {
    response = await queueCookiesLogin(id, stringifyCookies(user.auth.cookies));
    if (response.inQueue) response = await waitForAuthQueueResponse(response);
  }
  if (!response.success && user.auth.login && user.auth.password) {
    response = await queueUsernamePasswordLogin(
      id,
      user.auth.login,
      atob(user.auth.password)
    );
    if (response.inQueue) response = await waitForAuthQueueResponse(response);
  }

  if (!response.success && !response.mfa && !response.rateLimit)
    deleteUserAuth(user);

  return response;
}

let riotClientVersion;
let userAgentFetchPromise;
async function fetchRiotClientVersion(attempt = 1) {
  if (userAgentFetchPromise) return userAgentFetchPromise;

  let resolve;
  if (!userAgentFetchPromise) {
    console.log("Fetching latest Riot user-agent..."); // only log it the first time
    userAgentFetchPromise = new Promise((r) => (resolve = r));
  }

  const headers = {
    "User-Agent": "giorgi-o/skinpeek",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const githubReq = await fetch(
    "https://api.github.com/repos/Morilli/riot-manifests/contents/Riot%20Client/KeystoneFoundationLiveWin?ref=master",
    {
      headers,
    }
  );

  let json,
    versions,
    error = false;
  try {
    if (githubReq.statusCode !== 200) error = true;
    else {
      json = JSON.parse(githubReq.body);
      versions = json.map((file) => file.name.split("_")[0]);
    }
  } catch (e) {
    error = true;
  }

  if (error) {
    if (attempt === 3) {
      console.error("Failed to fetch latest Riot user-agent! (tried 3 times)");

      const fallbackVersion = "65.0.2.5073401";
      console.error(`Using version number ${fallbackVersion} instead...`);
    }

    console.error(`Failed to fetch latest Riot user-agent! (try ${attempt}/3`);
    console.error(githubReq);

    await wait(1000);
    return fetchRiotClientVersion(attempt + 1);
  }

  const compareVersions = (a, b) => {
    const aSplit = a.split(".");
    const bSplit = b.split(".");
    for (let i = 0; i < aSplit.length; i++) {
      if (aSplit[i] > bSplit[i]) return 1;
      if (aSplit[i] < bSplit[i]) return -1;
    }
    return 0;
  };
  versions.sort((a, b) => compareVersions(b, a));

  riotClientVersion = versions[0];
  userAgentFetchPromise = null;
  resolve?.();
}

async function getUserAgent() {
  // temporary bypass for Riot adding hCaptcha (see github issue #93)
  return "ShooterGame/11 Windows/10.0.22621.1.768.64bit";

  if (!riotClientVersion) await fetchRiotClientVersion();
  return `RiotClient/${riotClientVersion}.1234567 rso-auth (Windows;10;;Professional, x64)`;
}

function detectCloudflareBlock(req) {
  const blocked =
    req.statusCode === 403 && req.headers["x-frame-options"] === "SAMEORIGIN";

  if (blocked) {
    console.error(
      "[ !!! ] Error 1020: Your bot might be rate limited, it's best to check if your IP address/your hosting service is blocked by Riot - try hosting on your own PC to see if it solves the issue?"
    );
  }

  return blocked;
}

const deleteUserAuth = (user) => {
  user.auth = null;
  saveUser(user);
};

let failedOperations = [];
const loginQueuePollRate = 2000;
const loginRetryTimeout = 600000;

async function waitForAuthQueueResponse(queueResponse, pollRate = 300) {
  if (!queueResponse.inQueue) return queueResponse;
  while (true) {
    let response = await getAuthQueueItemStatus(queueResponse.c);
    if (response.processed) return response.result;
    await wait(pollRate);
  }
}

async function activeWaitForAuthQueueResponse(
  interaction,
  queueResponse,
  pollRate = loginQueuePollRate
) {
  // like the above, but edits the interaction to keep the user updated
  let replied = false;
  while (true) {
    let response = await getAuthQueueItemStatus(queueResponse.c);
    if (response.processed) return response.result;

    let embed;
    if (response.timestamp)
      embed = secondaryEmbed(
        s(interaction).error.QUEUE_WAIT.f({ t: response.timestamp })
      );
    else embed = secondaryEmbed("Processing...");
    if (replied) await interaction.editReply({ embeds: [embed] });
    else {
      await interaction.followUp({ embeds: [embed] });
      replied = true;
    }

    await wait(pollRate);
  }
}

async function loginUsernamePassword(
  interaction,
  username,
  password,
  operationIndex = null
) {
  let login = await queueUsernamePasswordLogin(
    interaction.user.id,
    username,
    password
  );
  if (login.inQueue)
    login = await activeWaitForAuthQueueResponse(interaction, login);

  const user = getUser(interaction.user.id);
  if (login.success && user) {
    console.log(`${interaction.user.tag} logged in as ${user.username}`);
    await interaction.editReply({
      embeds: [
        basicEmbed(
          s(interaction).info.LOGGED_IN.f(
            { u: user.username },
            interaction,
            false
          )
        ),
      ],
      ephemeral: true,
    });

    if (operationIndex !== null) {
      const index = failedOperations.findIndex(
        (o) => o.index === operationIndex
      );
      if (index > -1) failedOperations.splice(operationIndex, 1);
    }
  } else if (login.error) {
    console.error(`${interaction.user.tag} login error`);
    console.error(login.error);
    const index = operationIndex || generateOperationIndex();
    failedOperations.push({
      c: index,
      operation: Operations.USERNAME_PASSWORD,
      id: interaction.user.id,
      timestamp: Date.now(),
      username,
      password,
    });

    await interaction.editReply({
      embeds: [
        basicEmbed(
          s(interaction).error.GENERIC_ERROR.f({ e: login.error.message })
        ),
      ],
      components: [
        actionRow(
          retryAuthButton(
            interaction.user.id,
            index,
            s(interaction).info.AUTH_ERROR_RETRY
          )
        ),
      ],
    });
  } else {
    console.log(`${interaction.user.tag} login error`);
    await interaction.editReply(
      authFailureMessage(
        interaction,
        login,
        s(interaction).error.INVALID_PASSWORD,
        true
      )
    );
  }
}

async function login2FA(interaction, code, operationIndex = null) {
  let login = await queue2FACodeRedeem(interaction.user.id, code);
  if (login.inQueue) login = await waitForAuthQueueResponse(login);

  const user = getUser(interaction.user.id);
  if (login.success && user) {
    console.log(
      `${interaction.user.tag} logged in as ${user.username} with 2FA code`
    );
    await interaction.followUp({
      embeds: [
        basicEmbed(
          s(interaction).info.LOGGED_IN.f(
            { u: user.username },
            interaction,
            false
          )
        ),
      ],
    });
  } else if (login.error) {
    console.error(`${interaction.user.tag} 2FA error`);
    console.error(login.error);
    const index = operationIndex || generateOperationIndex();
    failedOperations.push({
      c: index,
      operation: Operations.MFA,
      id: interaction.user.id,
      timestamp: Date.now(),
      code,
    });

    await interaction.followUp({
      embeds: [
        basicEmbed(
          s(interaction).error.GENERIC_ERROR.f({ e: login.error.message })
        ),
      ],
      components: [
        actionRow(
          retryAuthButton(
            interaction.user.id,
            index,
            s(interaction).info.AUTH_ERROR_RETRY
          )
        ),
      ],
    });
  } else {
    console.log(`${interaction.user.tag} 2FA code failed`);
    await interaction.followUp(
      authFailureMessage(
        interaction,
        login,
        s(interaction).error.INVALID_2FA,
        true
      )
    );
  }
}

async function retryFailedOperation(interaction, index) {
  const operation = failedOperations.find((o) => o.c === index);
  if (!operation)
    return await interaction.followUp({
      embeds: [basicEmbed(s(interaction).error.AUTH_ERROR_RETRY_EXPIRED)],
      ephemeral: true,
    });

  switch (operation.operation) {
    case Operations.USERNAME_PASSWORD:
      await loginUsernamePassword(
        interaction,
        operation.username,
        operation.password,
        operation.c
      );
      break;
    case Operations.MFA:
      await login2FA(interaction, operation.code, operation.c);
      break;
  }
}

function cleanupFailedOperations() {
  failedOperations = failedOperations.filter(
    (o) => Date.now() - o.timestamp < loginRetryTimeout
  );
}

function generateOperationIndex() {
  let index = Math.floor(Math.random() * 100000);
  while (failedOperations.find((o) => o.c === index))
    index = Math.floor(Math.random() * 100000);
  return index;
}

const Operations = {
  USERNAME_PASSWORD: "up",
  MFA: "mf",
  COOKIES: "ck",
  NULL: "00",
};

const useLoginQueue = false;
const loginQueueInterval = 3000;

const queue = [];
const queueResults = [];
let queueCounter = 1;
let processingCount = 0;

let authQueueInterval;
let lastQueueProcess = 0; // timestamp

function startAuthQueue() {
  clearInterval(authQueueInterval);
  if (useLoginQueue)
    authQueueInterval = setInterval(processAuthQueue, loginQueueInterval);
}

async function queueUsernamePasswordLogin(id, username, password) {
  if (!useLoginQueue)
    return await Auth.redeemUsernamePassword(id, username, password);
  if (MultiQueue.useMultiqueue())
    return await MultiQueue.mqLoginUsernamePass(id, username, password);

  const c = queueCounter++;
  queue.push({
    operation: Operations.USERNAME_PASSWORD,
    c,
    id,
    username,
    password,
  });
  console.log(
    `Added Username+Password login to auth queue for user ${id} (c=${c})`
  );

  if (processingCount === 0) await processAuthQueue();
  return { inQueue: true, c };
}

async function queue2FACodeRedeem(id, code) {
  if (!useLoginQueue) return await Auth.redeem2FACode(id, code);
  if (MultiQueue.useMultiqueue())
    return { inQueue: false, ...(await MultiQueue.mqLogin2fa(id, code)) };

  const c = queueCounter++;
  queue.push({
    operation: Operations.MFA,
    c,
    id,
    code,
  });
  console.log(`Added 2fa code redeem to auth queue for user ${id} (c=${c})`);

  if (processingCount === 0) await processAuthQueue();
  return { inQueue: true, c };
}

async function queueCookiesLogin(id, cookies) {
  if (!useLoginQueue) return await Auth.redeemCookies(id, cookies);
  if (MultiQueue.useMultiqueue())
    return {
      inQueue: false,
      ...(await MultiQueue.mqLoginCookies(id, cookies)),
    };

  const c = queueCounter++;
  queue.push({
    operation: Operations.COOKIES,
    c,
    id,
    cookies,
  });
  console.log(`Added cookie login to auth queue for user ${id} (c=${c})`);

  if (processingCount === 0) await processAuthQueue();
  return { inQueue: true, c };
}

async function queueNullOperation(timeout) {
  if (!useLoginQueue) Util.wait(timeout);
  if (MultiQueue.useMultiqueue())
    return { inQueue: false, ...(await MultiQueue.mqNullOperation(timeout)) };

  const c = queueCounter++;
  queue.push({
    operation: Operations.NULL,
    c,
    timeout,
  });
  console.log(
    `Added null operation to auth queue with timeout ${timeout} (c=${c})`
  );

  if (processingCount === 0) await processAuthQueue();
  return { inQueue: true, c };
}

async function processAuthQueue() {
  lastQueueProcess = Date.now();
  if (!useLoginQueue || !queue.length) return;
  if (MultiQueue.useMultiqueue()) return;

  const item = queue.shift();
  console.log(
    `Processing auth queue item "${item.operation}" for ${item.id} (c=${item.c}, left=${queue.length})`
  );
  processingCount++;

  let result;
  try {
    switch (item.operation) {
      case Operations.USERNAME_PASSWORD:
        result = await Auth.redeemUsernamePassword(
          item.id,
          item.username,
          item.password
        );
        break;
      case Operations.MFA:
        result = await Auth.redeem2FACode(item.id, item.code);
        break;
      case Operations.COOKIES:
        result = await Auth.redeemCookies(item.id, item.cookies);
        break;
      case Operations.NULL:
        await Util.wait(item.timeout);
        result = { success: true };
        break;
    }
  } catch (e) {
    result = { success: false, error: e };
  }

  queueResults.push({
    c: item.c,
    result,
  });

  console.log(
    `Finished processing auth queue item "${item.operation}" for ${item.id} (c=${item.c})`
  );
  processingCount--;
}

async function getAuthQueueItemStatus(c) {
  if (MultiQueue.useMultiqueue())
    return await MultiQueue.mqGetAuthQueueItemStatus(c);

  let item = queue.find((i) => i.c === c);
  if (item) return { processed: false, ...remainingAndEstimatedTimestamp(c) };

  const index = queueResults.findIndex((i) => i.c === c);
  if (index === -1) return { processed: false, remaining: 0 };

  item = queueResults[index];
  queueResults.splice(index, 1);
  return { processed: true, result: item.result };
}

function remainingAndEstimatedTimestamp(c) {
  const remaining = c - queue[0].c;
  let timestamp = lastQueueProcess + (remaining + 1) * loginQueueInterval;

  timestamp += 2000; // Adjusting for UX
  timestamp = Math.round(timestamp / 1000);

  return { remaining, timestamp };
}

const formatVersion = 13;
let gameVersion;

let weapons,
  skins,
  rarities,
  buddies,
  sprays,
  cards,
  titles,
  bundles,
  battlepass;
let prices = { timestamp: null };

const clearCache = () => {
  weapons =
    skins =
    rarities =
    buddies =
    sprays =
    cards =
    titles =
    bundles =
    battlepass =
      null;
  prices = { timestamp: null };
};

async function getValorantVersion() {
  console.log("Fetching current valorant version...");

  const req = await fetch("https://valorant-api.com/v1/version");
  console.assert(
    req.statusCode === 200,
    `Valorant version status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant version data status code is ${json.status}!`,
    json
  );

  return json.data;
}

async function loadSkinsJSON(filename = "data/skins.json") {
  const jsonData = await asyncReadJSONFile(filename).catch(() => {});
  if (!jsonData || jsonData.formatVersion !== formatVersion) return;

  weapons = jsonData.weapons;
  skins = jsonData.skins;
  prices = jsonData.prices;
  rarities = jsonData.rarities;
  bundles = jsonData.bundles;
  buddies = jsonData.buddies;
  sprays = jsonData.sprays;
  cards = jsonData.cards;
  titles = jsonData.titles;
  battlepass = jsonData.battlepass;
}

function saveSkinsJSON(filename = "data/skins.json") {
  fs.writeFileSync(
    filename,
    JSON.stringify(
      {
        formatVersion,
        gameVersion,
        weapons,
        skins,
        prices,
        bundles,
        rarities,
        buddies,
        sprays,
        cards,
        titles,
        battlepass,
      },
      null,
      2
    )
  );
}

async function fetchData(types = null, checkVersion = false) {
  try {
    if (checkVersion || !gameVersion) {
      gameVersion = (await getValorantVersion()).manifestId;
      await loadSkinsJSON();
    }

    if (types === null)
      types = [
        skins,
        prices,
        bundles,
        rarities,
        buddies,
        cards,
        sprays,
        titles,
        battlepass,
      ];

    const promises = [];

    if (types.includes(skins) && (!skins || skins.version !== gameVersion))
      promises.push(getSkinList(gameVersion));
    if (types.includes(prices) && (!prices || prices.version !== gameVersion))
      promises.push(getPrices(gameVersion));
    if (
      types.includes(bundles) &&
      (!bundles || bundles.version !== gameVersion)
    )
      promises.push(getBundleList(gameVersion));
    if (
      types.includes(rarities) &&
      (!rarities || rarities.version !== gameVersion)
    )
      promises.push(getRarities(gameVersion));
    if (
      types.includes(buddies) &&
      (!buddies || buddies.version !== gameVersion)
    )
      promises.push(getBuddies(gameVersion));
    if (types.includes(cards) && (!cards || cards.version !== gameVersion))
      promises.push(getCards(gameVersion));
    if (types.includes(sprays) && (!sprays || sprays.version !== gameVersion))
      promises.push(getSprays(gameVersion));
    if (types.includes(titles) && (!titles || titles.version !== gameVersion))
      promises.push(getTitles(gameVersion));
    if (
      types.includes(battlepass) &&
      (!battlepass || battlepass.version !== gameVersion)
    )
      promises.push(fetchBattlepassInfo(gameVersion));

    if (!prices || Date.now() - prices.timestamp > 24 * 60 * 60 * 1000)
      promises.push(getPrices(gameVersion)); // refresh prices every 24h

    if (promises.length === 0) return;
    await Promise.all(promises);

    saveSkinsJSON();
  } catch (e) {
    console.error("There was an error while trying to fetch skin data!");
    console.error(e);
  }
}

async function getSkinList(gameVersion) {
  console.log("Fetching valorant skin list...");

  const req = await fetch("https://valorant-api.com/v1/weapons?language=all");
  console.assert(
    req.statusCode === 200,
    `Valorant skins status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant skins data status code is ${json.status}!`,
    json
  );

  skins = { version: gameVersion };
  weapons = {};
  for (const weapon of json.data) {
    weapons[weapon.uuid] = {
      uuid: weapon.uuid,
      names: weapon.displayName,
      icon: weapon.displayIcon,
      defaultSkinUuid: weapon.defaultSkinUuid,
    };
    for (const skin of weapon.skins) {
      const levelOne = skin.levels[0];

      let icon;
      if (skin.themeUuid === "5a629df4-4765-0214-bd40-fbb96542941f") {
        // default skins
        icon = skin.chromas[0] && skin.chromas[0].fullRender;
      } else {
        for (let i = 0; i < skin.levels.length; i++) {
          if (skin.levels[i] && skin.levels[i].displayIcon) {
            icon = skin.levels[i].displayIcon;
            break;
          }
        }
      }
      if (!icon) icon = null;
      skins[levelOne.uuid] = {
        uuid: levelOne.uuid,
        skinUuid: skin.uuid,
        weapon: weapon.uuid,
        names: skin.displayName,
        icon: icon,
        rarity: skin.contentTierUuid,
        defaultSkinUuid: weapon.defaultSkinUuid,
        levels: skin.levels,
        chromas: skin.chromas,
      };
    }
  }

  saveSkinsJSON();
}

async function getPrices(gameVersion, id = null) {
  // if no ID is passed, try with all users
  if (id === null) {
    for (const id of getUserList()) {
      const user = getUser(id);
      if (!user || !user.auth) continue;

      const success = await getPrices(gameVersion, id);
      if (success) return true;
    }
    return false;
  }

  let user = getUser(id);
  if (!user) return false;

  const authSuccess = await authUser(id);
  if (!authSuccess.success || !user.auth.rso || !user.auth.ent || !user.region)
    return false;

  user = getUser(id);
  console.log(`Fetching skin prices using ${user.username}'s access token...`);

  // https://github.com/techchrism/valorant-api-docs/blob/trunk/docs/Store/GET%20Store_GetOffers.md
  const req = await fetch(
    `https://pd.${userRegion(user)}.a.pvp.net/store/v1/offers/`,
    {
      headers: {
        Authorization: "Bearer " + user.auth.rso,
        "X-Riot-Entitlements-JWT": user.auth.ent,
      },
    }
  );
  console.assert(
    req.statusCode === 200,
    `Valorant skins prices code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
    return false; // user rso is invalid, should we delete the user as well?
  } else if (isMaintenance(json)) return false;

  prices = { version: gameVersion };
  for (const offer of json.Offers) {
    prices[offer.OfferID] = offer.Cost[Object.keys(offer.Cost)[0]];
  }

  prices.timestamp = Date.now();

  saveSkinsJSON();

  return true;
}

async function getBundleList(gameVersion) {
  console.log("Fetching valorant bundle list...");

  const req = await fetch("https://valorant-api.com/v1/bundles?language=all");
  console.assert(
    req.statusCode === 200,
    `Valorant bundles status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant bundles data status code is ${json.status}!`,
    json
  );

  bundles = { version: gameVersion };
  for (const bundle of json.data) {
    bundles[bundle.uuid] = {
      uuid: bundle.uuid,
      names: bundle.displayName,
      subNames: bundle.displayNameSubText,
      descriptions: bundle.extraDescription,
      icon: bundle.displayIcon,
      items: null,
      price: null,
      basePrice: null,
      expires: null,
      last_seen: null,
    };
  }

  // get bundle items from https://docs.valtracker.gg/bundles
  const req2 = await fetch("https://api.valtracker.gg/v1/bundles");
  console.assert(
    req2.statusCode === 200,
    `ValTracker bundles items status code is ${req.statusCode}!`,
    req
  );

  const json2 = JSON.parse(req2.body);
  console.assert(
    json.status === 200,
    `ValTracker bundles items data status code is ${json.status}!`,
    json
  );

  for (const bundleData of json2.data) {
    if (bundles[bundleData.uuid]) {
      const bundle = bundles[bundleData.uuid];
      const items = [];
      const defaultItemData = {
        amount: 1,
        discount: 0,
      };

      for (const weapon of bundleData.weapons)
        items.push({
          uuid: weapon.levels[0].uuid,
          type: itemTypes.SKIN,
          price: weapon.price,
          ...defaultItemData,
        });
      for (const buddy of bundleData.buddies)
        items.push({
          uuid: buddy.levels[0].uuid,
          type: itemTypes.BUDDY,
          price: buddy.price,
          ...defaultItemData,
        });
      for (const card of bundleData.cards)
        items.push({
          uuid: card.uuid,
          type: itemTypes.CARD,
          price: card.price,
          ...defaultItemData,
        });
      for (const spray of bundleData.sprays)
        items.push({
          uuid: spray.uuid,
          type: itemTypes.SPRAY,
          price: spray.price,
          ...defaultItemData,
        });

      bundle.items = items;
      bundle.last_seen = bundleData.last_seen;
      bundle.price = bundleData.price;
    }
  }

  saveSkinsJSON();
}

async function addBundleData(bundleData) {
  await fetchData([bundles]);

  const bundle = bundles[bundleData.uuid];
  if (bundle) {
    bundle.items = bundleData.items.map((item) => {
      return {
        uuid: item.uuid,
        type: item.type,
        price: item.price,
        basePrice: item.basePrice,
        discount: item.discount,
        amount: item.amount,
      };
    });
    bundle.price = bundleData.price;
    bundle.basePrice = bundleData.basePrice;
    bundle.expires = bundleData.expires;

    saveSkinsJSON();
  }
}

async function getRarities(gameVersion) {
  console.log("Fetching skin rarities list...");

  const req = await fetch("https://valorant-api.com/v1/contenttiers/");
  console.assert(
    req.statusCode === 200,
    `Valorant rarities status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant rarities data status code is ${json.status}!`,
    json
  );

  rarities = { version: gameVersion };
  for (const rarity of json.data) {
    rarities[rarity.uuid] = {
      uuid: rarity.uuid,
      name: rarity.devName,
      icon: rarity.displayIcon,
    };
  }

  saveSkinsJSON();

  return true;
}

async function getBuddies(gameVersion) {
  console.log("Fetching gun buddies list...");

  const req = await fetch("https://valorant-api.com/v1/buddies?language=all");
  console.assert(
    req.statusCode === 200,
    `Valorant buddies status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant buddies data status code is ${json.status}!`,
    json
  );

  buddies = { version: gameVersion };
  for (const buddy of json.data) {
    const levelOne = buddy.levels[0];
    buddies[levelOne.uuid] = {
      uuid: levelOne.uuid,
      names: buddy.displayName,
      icon: levelOne.displayIcon,
    };
  }

  saveSkinsJSON();
}

async function getCards(gameVersion) {
  console.log("Fetching player cards list...");

  const req = await fetch(
    "https://valorant-api.com/v1/playercards?language=all"
  );
  console.assert(
    req.statusCode === 200,
    `Valorant cards status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant cards data status code is ${json.status}!`,
    json
  );

  cards = { version: gameVersion };
  for (const card of json.data) {
    cards[card.uuid] = {
      uuid: card.uuid,
      names: card.displayName,
      icons: {
        small: card.smallArt,
        wide: card.wideArt,
        large: card.largeArt,
      },
    };
  }

  saveSkinsJSON();
}

async function getSprays(gameVersion) {
  console.log("Fetching sprays list...");

  const req = await fetch("https://valorant-api.com/v1/sprays?language=all");
  console.assert(
    req.statusCode === 200,
    `Valorant sprays status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant sprays data status code is ${json.status}!`,
    json
  );

  sprays = { version: gameVersion };
  for (const spray of json.data) {
    sprays[spray.uuid] = {
      uuid: spray.uuid,
      names: spray.displayName,
      icon: spray.fullTransparentIcon || spray.displayIcon,
    };
  }

  saveSkinsJSON();
}

async function getTitles(gameVersion) {
  console.log("Fetching player titles list...");

  const req = await fetch(
    "https://valorant-api.com/v1/playertitles?language=all"
  );
  console.assert(
    req.statusCode === 200,
    `Valorant titles status code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  console.assert(
    json.status === 200,
    `Valorant titles data status code is ${json.status}!`,
    json
  );

  titles = { version: gameVersion };
  for (const title of json.data) {
    titles[title.uuid] = {
      uuid: title.uuid,
      names: title.displayName,
      text: title.titleText,
    };
  }

  saveSkinsJSON();
}

async function fetchBattlepassInfo(gameVersion) {
  console.log("Fetching battlepass UUID and end date...");

  // terminology for this function:
  // act = one in-game period with one battlepass, usually around 2 months
  // episode = 3 acts
  // season = both act and episode. basically any "event" with a start and end date.

  // fetch seasons data (current act end date)
  const req1 = await fetch("https://valorant-api.com/v1/seasons");
  console.assert(
    req1.statusCode === 200,
    `Valorant seasons status code is ${req1.statusCode}!`,
    req1
  );

  const seasons_json = JSON.parse(req1.body);
  console.assert(
    seasons_json.status === 200,
    `Valorant seasons data status code is ${seasons_json.status}!`,
    seasons_json
  );

  // fetch battlepass data (battlepass uuid)
  const req2 = await fetch("https://valorant-api.com/v1/contracts");
  console.assert(
    req2.statusCode === 200,
    `Valorant contracts status code is ${req2.statusCode}!`,
    req2
  );

  const contracts_json = JSON.parse(req2.body);
  console.assert(
    contracts_json.status === 200,
    `Valorant contracts data status code is ${contracts_json.status}!`,
    contracts_json
  );

  // we need to find the "current battlepass season" i.e. the last season to have a battlepass.
  // it's not always the current season, since between acts there is sometimes a period during
  // server maintenance where the new act has started but there is no battlepass contract for it yet.

  // get all acts
  // const seasonUuids = seasons_json.data.filter(season => season.type === "EAresSeasonType::Act").map(season => season.uuid);
  const all_acts = seasons_json.data.filter(
    (season) => season.type === "EAresSeasonType::Act"
  );
  // sort them by start date (oldest first)
  all_acts.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  // and reverse
  all_acts.reverse();
  // we sort then reverse instead of just sorting the other way round directly, because most likely
  // the acts are already sorted beforehand, so this is more efficient.

  // get all battlepass contracts
  const all_bp_contracts = contracts_json.data.filter(
    (contract) => contract.content.relationType === "Season"
  );

  // find the last act that has a battlepass
  let currentSeason = null;
  let currentBattlepass = null;
  for (const act of all_acts) {
    const bp_contract = all_bp_contracts.find(
      (contract) => contract.content.relationUuid === act.uuid
    );
    if (bp_contract) {
      currentSeason = act;
      currentBattlepass = bp_contract;
      break;
    }
  }

  // save data
  battlepass = {
    version: gameVersion,
    uuid: currentBattlepass.uuid,
    end: currentSeason.endTime,
    chapters: currentBattlepass.content.chapters,
  };

  saveSkinsJSON();
}

async function getItem(uuid, type) {
  switch (type) {
    case itemTypes.SKIN:
      return await getSkin(uuid);
    case itemTypes.BUDDY:
      return await getBuddy(uuid);
    case itemTypes.CARD:
      return await getCard(uuid);
    case itemTypes.SPRAY:
      return await getSpray(uuid);
    case itemTypes.TITLE:
      return await getTitle(uuid);
  }
}

async function getSkin(uuid, reloadData = true) {
  if (reloadData) await fetchData([skins, prices]);

  let skin = skins[uuid];
  if (!skin) return null;

  skin.price = await getPrice(uuid);

  return skin;
}

async function getSkinFromSkinUuid(uuid, reloadData = true) {
  if (reloadData) await fetchData([skins, prices]);

  let skin = Object.values(skins).find((skin) => skin.skinUuid === uuid);
  if (!skin) return null;

  skin.price = await getPrice(skin.uuid);

  return skin;
}

async function getWeapon(uuid) {
  await fetchData([skins]);

  return weapons[uuid] || null;
}

async function getPrice(uuid) {
  if (!prices) await fetchData([prices]);

  if (prices[uuid]) return prices[uuid];

  if (!bundles) await fetchData([bundles]); // todo rewrite this part
  const bundle = Object.values(bundles).find((bundle) =>
    bundle.items?.find((item) => item.uuid === uuid)
  );
  if (bundle) {
    const bundleItem = bundle.items.find((item) => item.uuid === uuid);
    return bundleItem.price || null;
  }

  return null;
}

async function getRarity(uuid) {
  if (!rarities) await fetchData([rarities]);
  if (rarities) return rarities[uuid] || null;
}

async function getAllSkins() {
  return await Promise.all(
    Object.values(skins)
      .filter((o) => typeof o === "object")
      .map((skin) => getSkin(skin.uuid, false))
  );
}

async function searchSkin(query, locale, limit = 20, threshold = -5000) {
  await fetchData([skins, prices]);

  const valLocale = discToValLang[locale];
  const keys = [`names.${valLocale}`];
  if (valLocale !== DEFAULT_VALORANT_LANG)
    keys.push(`names.${DEFAULT_VALORANT_LANG}`);

  const allSkins = await getAllSkins();
  return fuzzysort.go(query, allSkins, {
    keys: keys,
    limit: limit,
    threshold: threshold,
    all: true,
  });
}

async function getBundle(uuid) {
  await fetchData([bundles]);
  return bundles[uuid];
}

function getAllBundles() {
  // reverse the array so that the older bundles are first
  return Object.values(bundles)
    .reverse()
    .filter((o) => typeof o === "object");
}

async function searchBundle(query, locale, limit = 20, threshold = -1000) {
  await fetchData([bundles]);

  const valLocale = discToValLang[locale];
  const keys = [`names.${valLocale}`];
  if (valLocale !== DEFAULT_VALORANT_LANG)
    keys.push(`names.${DEFAULT_VALORANT_LANG}`);

  return fuzzysort.go(query, getAllBundles(), {
    keys: keys,
    limit: limit,
    threshold: threshold,
    all: true,
  });
}

async function getBuddy(uuid) {
  if (!buddies) await fetchData([buddies]);
  return buddies[uuid];
}

async function getSpray(uuid) {
  if (!sprays) await fetchData([sprays]);
  return sprays[uuid];
}

async function getCard(uuid) {
  if (!cards) await fetchData([cards]);
  return cards[uuid];
}

async function getTitle(uuid) {
  if (!titles) await fetchData([titles]);
  return titles[uuid];
}

async function getBattlepassInfo() {
  if (!battlepass) await fetchData([battlepass]);
  return battlepass;
}

const VAL_COLOR_1 = 0xfd4553;
const VAL_COLOR_2 = 0x202225;
const VAL_COLOR_3 = 0xeaeeb2;

const VPEmoji = "<:vp:1227277766068666469>";

const thumbnails = [
  "https://media.valorant-api.com/sprays/290565e7-4540-5764-31da-758846dc2a5a/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/31ba7f82-4fcb-4cbb-a719-06a3beef8603/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/fef66645-4e35-ff38-1b7c-799dd5fc7468/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/02f4c1db-46bb-a572-e830-0886edbb0981/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/40222bb5-4fce-9320-f4f1-95861df83c47/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/a7e1a9b6-4ab5-e6f7-e5fe-bc86f87b44ee/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/09786b0a-4c3e-5ba8-46ab-c49255620a5f/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/7b0e0c8d-4f91-2a76-19b9-079def2fa843/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/ea087a08-4b9f-bd0d-15a5-d3ba09c4c381/fulltransparenticon.png",
  "https://media.valorant-api.com/sprays/40ff9251-4c11-b729-1f27-088ee032e7ce/fulltransparenticon.png",
];

const fetchSkinPrices = true;
const notice = "";
const onlyShowNoticeOnce = true;
const linkItemImage = true;

function authFailureMessage(
  interactionOrId,
  authResponse,
  message = "AUTH_ERROR",
  isEphemeral = false
) {
  const id = interactionOrId?.user?.id || interactionOrId;
  const tag = interactionOrId?.user?.tag || id;
  let embed;

  if (authResponse.maintenance)
    embed = basicEmbed(s(interactionOrId).error.MAINTENANCE);
  else if (authResponse.mfa) {
    console.log(`${tag} needs 2FA code`);

    // TMP: 2FA doesn't work because of auth flow change (see issue #99)
    embed = basicEmbed(s(interactionOrId).info.MFA_DISABLED);

    /*
          if(authResponse.method === "email") {
              if(isEphemeral) embed = basicEmbed(s(interactionOrId).info.MFA_EMAIL.f({e: escapeMarkdown(authResponse.email)}));
              else embed = basicEmbed(s(interactionOrId).info.MFA_EMAIL_HIDDEN);
          }
          else embed = basicEmbed(s(interactionOrId).info.MFA_GENERIC);
          */
  } else if (authResponse.rateLimit) {
    console.log(`${tag} got rate-limited`);
    if (typeof authResponse.rateLimit === "number")
      embed = basicEmbed(
        s(interactionOrId).error.LOGIN_RATELIMIT_UNTIL.f({
          t: Math.ceil(authResponse.rateLimit / 1000),
        })
      );
    else embed = basicEmbed(s(interactionOrId).error.LOGIN_RATELIMIT);
  } else {
    embed = basicEmbed(message);

    // two-strike system
    const user = getUser(id);
    if (user) {
      user.authFailures++;
      saveUser(user);
    }
  }

  return {
    embeds: [embed],
    ephemeral: true,
  };
}

async function skinChosenEmbed(interaction, skin) {
  const channel =
    interaction.channel || (await fetchChannel(interaction.channelId));
  let description = s(interaction).info.ALERT_SET.f({
    s: await skinNameAndEmoji(skin, channel, interaction),
  });
  if (fetchSkinPrices && !skin.price)
    description += s(interaction).info.ALERT_BP_SKIN;
  return {
    description: description,
    color: VAL_COLOR_1,
    thumbnail: {
      url: skin.icon,
    },
  };
}

async function renderOffers(
  shop,
  interaction,
  valorantUser,
  VPemoji,
  otherId = null
) {
  const forOtherUser = otherId && otherId !== interaction.user.id;
  const otherUserMention = `<@${otherId}>`;
  const targetId = forOtherUser ? otherId : interaction?.user?.id;

  if (!shop.success) {
    let errorText;

    if (forOtherUser)
      errorText = s(interaction).error.AUTH_ERROR_SHOP_OTHER.f({
        u: otherUserMention,
      });
    else errorText = s(interaction).error.AUTH_ERROR_SHOP;

    return authFailureMessage(interaction, shop, errorText);
  }

  let headerText;
  if (forOtherUser) {
    const json = readUserJson(otherId);

    let usernameText = otherUserMention;
    if (json.accounts.length > 1)
      usernameText +=
        " " +
        s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: json.currentAccount });

    headerText = s(interaction).info.SHOP_HEADER.f({
      u: usernameText,
      t: shop.expires,
    });
  } else
    headerText = s(interaction).info.SHOP_HEADER.f(
      { u: valorantUser.username, t: shop.expires },
      interaction
    );

  const embeds = [headerEmbed(headerText)];

  for (const uuid of shop.offers) {
    const skin = await getSkin(uuid);
    const price = isDefaultSkin(skin) ? "0" : skin.price; // force render price for defaults
    const embed = await skinEmbed(skin.uuid, price, interaction, VPemoji);
    embeds.push(embed);
  }

  // show notice if there is one
  if (notice && valorantUser) {
    // users shouldn't see the same notice twice
    if (!onlyShowNoticeOnce || valorantUser.lastNoticeSeen !== notice) {
      // the notice can either be just a simple string, or a raw JSON embed data object
      if (typeof notice === "string") {
        if (notice.startsWith("{"))
          embeds.push(EmbedBuilder.from(JSON.parse(notice)).toJSON());
        else embeds.push(basicEmbed(notice));
      } else embeds.push(EmbedBuilder.from(notice).toJSON());

      valorantUser.lastNoticeSeen = notice;
      saveUser(valorantUser);
    }
  }

  let components;
  if (forOtherUser && !getSetting(otherId, "othersCanUseAccountButtons")) {
    components = null;
  } else {
    components = switchAccountButtons(
      interaction,
      "shop",
      true,
      "daily",
      targetId
    );
  }

  const levels = await getSkinLevels(shop.offers, interaction);
  if (levels)
    components === null ? (components = [levels]) : components.unshift(levels);

  return {
    embeds,
    components,
  };
}

async function renderAccessoryOffers(
  shop,
  interaction,
  valorantUser,
  KCemoji,
  id = interaction?.user?.id
) {
  if (!shop.success) {
    let errorText = s(interaction).error.AUTH_ERROR_SHOP;

    return authFailureMessage(interaction, shop, errorText);
  }

  const forOtherUser = id && id !== interaction.user.id;
  const otherUserMention = `<@${id}>`;

  let headerText;
  if (forOtherUser) {
    const json = readUserJson(id);

    let usernameText = otherUserMention;
    if (json.accounts.length > 1)
      usernameText +=
        " " +
        s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: json.currentAccount });

    headerText = s(interaction).info.ACCESSORY_SHOP_HEADER.f({
      u: usernameText,
      t: shop.accessory.expires,
    });
  } else
    headerText = s(interaction).info.ACCESSORY_SHOP_HEADER.f(
      { u: valorantUser.username, t: shop.accessory.expires },
      interaction
    );

  const embeds = [headerEmbed(headerText)];
  for (const offer of shop.accessory.offers) {
    for (const reward of offer.rewards) {
      switch (reward.ItemTypeID) {
        case "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475": //sprays
          embeds.push(
            await sprayEmbed(reward.ItemID, offer.cost, interaction, KCemoji)
          );
          break;
        case "dd3bf334-87f3-40bd-b043-682a57a8dc3a": //gun buddies
          embeds.push(
            await buddyEmbed(reward.ItemID, offer.cost, interaction, KCemoji)
          );
          break;
        case "3f296c07-64c3-494c-923b-fe692a4fa1bd": //cards
          embeds.push(
            await cardEmbed(reward.ItemID, offer.cost, interaction, KCemoji)
          );
          break;
        case "de7caa6b-adf7-4588-bbd1-143831e786c6": //titles
          embeds.push(
            await titleEmbed(reward.ItemID, offer.cost, interaction, KCemoji)
          );
          break;
        default:
          console.log(reward.ItemTypeID);
      }
    }
  }

  // leave a little message if the accessory shop is empty (i.e. they have every single accessory in the game)
  if (shop.accessory.offers.length === 0) {
    embeds.push(basicEmbed(s(interaction).info.NO_MORE_ACCESSORIES));
  }

  // show notice if there is one
  if (notice && valorantUser) {
    // users shouldn't see the same notice twice
    if (!onlyShowNoticeOnce || valorantUser.lastNoticeSeen !== notice) {
      // the notice can either be just a simple string, or a raw JSON embed data object
      if (typeof notice === "string") {
        if (notice.startsWith("{"))
          embeds.push(EmbedBuilder.from(JSON.parse(notice)).toJSON());
        else embeds.push(basicEmbed(notice));
      } else embeds.push(EmbedBuilder.from(notice).toJSON());

      valorantUser.lastNoticeSeen = notice;
      saveUser(valorantUser);
    }
  }

  let components = switchAccountButtons(
    interaction,
    "accessoryshop",
    true,
    "accessory",
    id
  );

  return {
    embeds,
    components,
  };
}

async function getSkinLevels(offers, interaction, nightmarket = false) {
  const skinSelector = new StringSelectMenuBuilder()
    .setCustomId("select-skin-with-level")
    .setPlaceholder(s(interaction).info.SELECT_SKIN_WITH_LEVEL);

  for (const uuid of offers) {
    let skin = await getSkin(nightmarket ? uuid.uuid : uuid);
    if (!skin) continue;

    for (let i = 0; i < skin.levels.length; i++) {
      const level = skin.levels[i];
      if (level.streamedVideo) {
        skinSelector.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`${l(skin.names, interaction)}`)
            .setValue(`${skin.uuid}`)
        );
        break;
      }
    }
  }

  if (skinSelector.options.length === 0) return false;
  return new ActionRowBuilder().addComponents(skinSelector);
}

async function renderBundles(bundles, interaction, VPemoji) {
  if (!bundles.success)
    return authFailureMessage(
      interaction,
      bundles,
      s(interaction).error.AUTH_ERROR_BUNDLES
    );

  bundles = bundles.bundles;

  if (bundles.length === 1) {
    const bundle = await getBundle(bundles[0].uuid);

    const renderedBundle = await renderBundle(
      bundle,
      interaction,
      VPemoji,
      false
    );
    const titleEmbed = renderedBundle.embeds[0];
    titleEmbed.title = s(interaction).info.BUNDLE_HEADER.f({
      b: titleEmbed.title,
    });
    titleEmbed.description += ` *(${s(interaction).info.EXPIRES.f({
      t: bundle.expires,
    })})*`;

    return renderedBundle;
  }

  const embeds = [
    {
      title: s(interaction).info.BUNDLES_HEADER,
      description: s(interaction).info.BUNDLES_HEADER_DESC,
      color: VAL_COLOR_1,
    },
  ];

  const buttons = [];

  for (const bundleData of bundles) {
    const bundle = await getBundle(bundleData.uuid);

    const subName = bundle.subNames
      ? l(bundle.subNames, interaction) + "\n"
      : "";
    const slantedDescription = bundle.descriptions
      ? "*" + l(bundle.descriptions, interaction) + "*\n"
      : "";
    const embed = {
      title: s(interaction).info.BUNDLE_NAME.f({
        b: l(bundle.names, interaction),
      }),
      description: `${subName}${slantedDescription}${VPemoji} **${
        bundle.price || s(interaction).info.FREE
      }** - ${s(interaction).info.EXPIRES.f({ t: bundle.expires })}`,
      color: VAL_COLOR_2,
      thumbnail: {
        url: bundle.icon,
      },
    };
    embeds.push(embed);

    if (buttons.length < 5) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`viewbundle/${interaction.user.id}/${bundle.uuid}`)
          .setStyle(ButtonStyle.Primary)
          .setLabel(l(bundle.names, interaction))
          .setEmoji("🔎")
      );
    }
  }

  return {
    embeds: embeds,
    components: [new ActionRowBuilder().addComponents(...buttons)],
  };
}

async function renderBundle(bundle, interaction, emoji, includeExpires = true) {
  const subName = bundle.subNames ? l(bundle.subNames, interaction) + "\n" : "";
  const slantedDescription = bundle.descriptions
    ? "*" + l(bundle.descriptions, interaction) + "*\n"
    : "";
  const strikedBundleBasePrice = bundle.basePrice
    ? " ~~" + bundle.basePrice + "~~"
    : "";
  const UnixStamp =
    bundle.last_seen / 1000
      ? `\n_${s(interaction).info.BUNDLE_RELEASED.f({
          t: Math.round(bundle.last_seen / 1000),
        })}_\n`
      : "";

  if (!bundle.items)
    return {
      embeds: [
        {
          title: s(interaction).info.BUNDLE_NAME.f({
            b: l(bundle.names, interaction),
          }),
          description: `${subName}${slantedDescription}`,
          color: VAL_COLOR_1,
          image: {
            url: bundle.icon,
          },
          footer: {
            text: s(interaction).info.NO_BUNDLE_DATA,
          },
        },
      ],
    };

  const bundleTitleEmbed = {
    title: s(interaction).info.BUNDLE_NAME.f({
      b: l(bundle.names, interaction),
    }),
    description: `${subName}${slantedDescription}${UnixStamp}${emoji} **${bundle.price}**${strikedBundleBasePrice}`,
    color: VAL_COLOR_3,
    image: {
      url: bundle.icon,
    },
  };

  if (includeExpires && bundle.expires)
    bundleTitleEmbed.description += ` (${(bundle.expires > Date.now() / 1000
      ? s(interaction).info.EXPIRES
      : s(interaction).info.EXPIRED
    ).f({ t: bundle.expires })})`;

  const itemEmbeds = await renderBundleItems(bundle, interaction, emoji);
  const levels = await getSkinLevels(
    bundle.items.map((i) => i.uuid),
    interaction
  );
  return levels
    ? { embeds: [bundleTitleEmbed, ...itemEmbeds], components: [levels] }
    : { embeds: [bundleTitleEmbed, ...itemEmbeds], components: [] };
}

async function renderNightMarket(market, interaction, valorantUser, emoji) {
  if (!market.success)
    return authFailureMessage(
      interaction,
      market,
      s(interaction).error.AUTH_ERROR_NMARKET
    );

  if (!market.offers) {
    const nextNightMarketTimestamp = await getNextNightMarketTimestamp();
    const text = nextNightMarketTimestamp
      ? s(interaction).error.NO_NMARKET_WITH_DATE.f({
          t: nextNightMarketTimestamp,
        })
      : s(interaction).error.NO_NMARKET;
    return { embeds: [basicEmbed(text)] };
  }

  const embeds = [
    {
      description: s(interaction).info.NMARKET_HEADER.f(
        { u: valorantUser.username, t: market.expires },
        interaction
      ),
      color: VAL_COLOR_3,
    },
  ];

  for (const offer of market.offers) {
    const skin = await getSkin(offer.uuid);

    const embed = await skinEmbed(skin.uuid, skin.price, interaction, emoji);
    embed.description = `${emoji} **${offer.nmPrice}**\n${emoji} ~~${offer.realPrice}~~ (-${offer.percent}%)`;

    embeds.push(embed);
  }

  const components = switchAccountButtons(interaction, "nm", true);

  const levels = await getSkinLevels(market.offers, interaction, true);
  if (levels) components.unshift(levels);
  return {
    embeds,
    components,
  };
}

async function renderBattlepass(
  battlepass,
  targetlevel,
  interaction,
  targetId = interaction.user.id
) {
  if (!battlepass.success)
    return authFailureMessage(
      interaction,
      battlepass,
      s(interaction).error.AUTH_ERROR_BPASS
    );
  if (battlepass.nextReward.rewardType === "EquippableCharmLevel") {
    battlepass.nextReward.rewardType = s(interaction).battlepass.GUN_BUDDY;
  }
  if (battlepass.nextReward.rewardType === "EquippableSkinLevel") {
    battlepass.nextReward.rewardType = s(interaction).battlepass.SKIN;
  }
  if (battlepass.nextReward.rewardType === "PlayerCard") {
    battlepass.nextReward.rewardType = s(interaction).battlepass.CARD;
  }
  if (battlepass.nextReward.rewardType === "Currency") {
    battlepass.nextReward.rewardType = s(interaction).battlepass.CURRENCY;
  }
  if (battlepass.nextReward.rewardType === "Spray") {
    battlepass.nextReward.rewardType = s(interaction).battlepass.SPRAY;
  }
  if (battlepass.nextReward.rewardName === undefined) {
    battlepass.nextReward.rewardName = "Name not found";
  }
  const user = getUser(targetId);

  let embeds = [];
  if (battlepass.bpdata.progressionLevelReached < 55) {
    const forOtherUser = targetId && targetId !== interaction.user.id;
    const otherUserMention = `<@${targetId}>`;

    let headerText;
    if (forOtherUser) {
      const json = readUserJson(targetId);

      let usernameText = otherUserMention;
      if (json.accounts.length > 1)
        usernameText +=
          " " +
          s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({
            n: json.currentAccount,
          });

      headerText = s(interaction).battlepass.TIER_HEADER.f({ u: usernameText });
    } else
      headerText = s(interaction).battlepass.TIER_HEADER.f(
        { u: user.username },
        interaction
      );

    embeds.push(
      {
        title: s(interaction).battlepass.CALCULATIONS_TITLE,
        thumbnail: {
          url: thumbnails[Math.floor(Math.random() * thumbnails.length)],
        },
        description: `${headerText}\n${createProgressBar(
          battlepass.xpneeded,
          battlepass.bpdata.progressionTowardsNextLevel,
          battlepass.bpdata.progressionLevelReached
        )}`,
        color: VAL_COLOR_1,
        fields: [
          {
            name: s(interaction).battlepass.GENERAL_COL,
            value: `${s(interaction).battlepass.TOTAL_ROW}\n${
              s(interaction).battlepass.LVLUP_ROW
            }\n${s(interaction).battlepass.TIER50_ROW.f({ t: targetlevel })}\n${
              s(interaction).battlepass.WEEKLY_LEFT_ROW
            }`,
            inline: true,
          },
          {
            name: s(interaction).battlepass.XP_COL,
            value: `\`${battlepass.totalxp}\`\n\`${battlepass.xpneeded}\`\n\`${battlepass.totalxpneeded}\`\n\`${battlepass.weeklyxp}\``,
            inline: true,
          },
        ],
        footer: {
          text: battlepass.battlepassPurchased
            ? s(interaction).battlepass.BP_PURCHASED.f(
                { u: user.username },
                interaction
              )
            : "",
        },
      },
      {
        title: s(interaction).battlepass.GAMES_HEADER,
        color: VAL_COLOR_1,
        fields: [
          {
            name: s(interaction).battlepass.GAMEMODE_COL,
            value: `${s(interaction).battlepass.SPIKERUSH_ROW}\n${
              s(interaction).battlepass.NORMAL_ROW
            }\n`,
            inline: true,
          },
          {
            name: "#",
            value: `\`${battlepass.spikerushneeded}\`\n\`${battlepass.normalneeded}\``,
            inline: true,
          },
          {
            name: s(interaction).battlepass.INCL_WEEKLIES_COL,
            value: `\`${battlepass.spikerushneededwithweeklies}\`\n\`${battlepass.normalneededwithweeklies}\``,
            inline: true,
          },
        ],
        footer: {
          text: s(interaction).battlepass.ACT_END.f({
            d: battlepass.season_days_left,
          }),
        },
      },
      {
        title: s(interaction).battlepass.XP_HEADER,
        color: VAL_COLOR_1,
        fields: [
          {
            name: s(interaction).battlepass.AVERAGE_COL,
            value: `${s(interaction).battlepass.DAILY_XP_ROW}\n${
              s(interaction).battlepass.WEEKLY_XP_ROW
            }`,
            inline: true,
          },
          {
            name: s(interaction).battlepass.XP_COL,
            value: `\`${battlepass.dailyxpneeded}\`\n\`${battlepass.weeklyxpneeded}\``,
            inline: true,
          },
          {
            name: s(interaction).battlepass.INCL_WEEKLIES_COL,
            value: `\`${battlepass.dailyxpneededwithweeklies}\`\n\`${battlepass.weeklyxpneededwithweeklies}\``,
            inline: true,
          },
        ],
      },
      {
        title: s(interaction).battlepass.NEXT_BP_REWARD,
        color: VAL_COLOR_1,
        fields: [
          {
            name: `**${s(interaction).battlepass.TYPE}:** \`${
              battlepass.nextReward.rewardType
            }\``,
            value: `**${s(interaction).battlepass.REWARD}:** ${
              battlepass.nextReward.rewardName
            }\n**XP:** ${battlepass.bpdata.progressionTowardsNextLevel}/${
              battlepass.nextReward.XP
            }`,
            inline: true,
          },
        ],
        thumbnail: {
          url: battlepass.nextReward.rewardIcon,
        },
      }
    );
  } else {
    embeds.push({
      description: s(interaction).battlepass.FINISHED,
      color: VAL_COLOR_1,
    });
  }

  const components = switchAccountButtons(
    interaction,
    "bp",
    false,
    false,
    targetId
  );

  return { embeds, components };
}

async function renderBundleItems(bundle, interaction, VPemojiString) {
  if (!bundle.items) return [];

  const priorities = {};
  priorities[itemTypes.SKIN] = 5;
  priorities[itemTypes.BUDDY] = 4;
  priorities[itemTypes.SPRAY] = 3;
  priorities[itemTypes.CARD] = 2;
  priorities[itemTypes.TITLE] = 1;

  const items = bundle.items.sort(
    (a, b) => priorities[b.type] - priorities[a.type]
  );

  const embeds = [];
  for (const item of items) {
    const embed = await bundleItemEmbed(item, interaction, VPemojiString);

    if (item.amount !== 1) embed.title = `${item.amount}x ${embed.title}`;
    if (item.basePrice && item.price !== item.basePrice) {
      embed.description = `${VPemojiString} **${
        item.price || s(interaction).info.FREE
      }** ~~${item.basePrice}~~`;
      if (item.type === itemTypes.TITLE && item.item)
        embed.description = "`" + item.item.text + "`\n\n" + embed.description;
    }

    embeds.push(embed);
  }

  // discord has a limit of 10 embeds (9 if we count the bundle title)
  if (embeds.length > 9) {
    embeds.length = 8;
    embeds.push(
      basicEmbed(s(interaction).info.MORE_ITEMS.f({ n: items.length - 8 }))
    );
  }

  return embeds;
}

async function bundleItemEmbed(item, interaction, VPemojiString) {
  switch (item.type) {
    case itemTypes.SKIN:
      return skinEmbed(item.uuid, item.price, interaction, VPemojiString);
    case itemTypes.BUDDY:
      return buddyEmbed(item.uuid, item.price, interaction, VPemojiString);
    case itemTypes.CARD:
      return cardEmbed(item.uuid, item.price, interaction, VPemojiString);
    case itemTypes.SPRAY:
      return sprayEmbed(item.uuid, item.price, interaction, VPemojiString);
    case itemTypes.TITLE:
      return titleEmbed(item.uuid, item.price, interaction, VPemojiString);
    default:
      return basicEmbed(
        s(interaction).error.UNKNOWN_ITEM_TYPE.f({ t: item.type })
      );
  }
}

async function skinEmbed(
  uuid,
  price,
  interactionOrId,
  VPemojiString,
  channel = null
) {
  const skin = await getSkin(uuid);
  const colorMap = {
    "0cebb8be-46d7-c12a-d306-e9907bfc5a25": 0x009984,
    "e046854e-406c-37f4-6607-19a9ba8426fc": 0xf99358,
    "60bca009-4182-7998-dee7-b8a2558dc369": 0xd1538c,
    "12683d76-48d7-84a3-4e09-6985794f0445": 0x5a9fe1,
    "411e4a55-4e59-7757-41f0-86a53f101bb5": 0xf9d563,
  };

  const color = colorMap[skin.rarity] || "000000"; // default to black
  return {
    title: await skinNameAndEmoji(
      skin,
      interactionOrId.channel || channel,
      interactionOrId
    ),
    url: linkItemImage ? skin.icon : null,
    description: priceDescription(VPemojiString, price),
    color: color,
    thumbnail: {
      url: skin.icon,
    },
  };
}

async function buddyEmbed(uuid, price, locale, emojiString) {
  const buddy = await getBuddy(uuid);
  return {
    title: l(buddy.names, locale),
    url: linkItemImage ? buddy.icon : null,
    description: priceDescription(emojiString, price),
    color: VAL_COLOR_2,
    thumbnail: {
      url: buddy.icon,
    },
  };
}

async function cardEmbed(uuid, price, locale, emojiString) {
  const card = await getCard(uuid);
  return {
    title: l(card.names, locale),
    url: linkItemImage ? card.icons.large : null,
    description: priceDescription(emojiString, price),
    color: VAL_COLOR_2,
    thumbnail: {
      url: card.icons.large,
    },
  };
}

async function sprayEmbed(uuid, price, locale, emojiString) {
  const spray = await getSpray(uuid);
  return {
    title: l(spray.names, locale),
    url: linkItemImage ? spray.icon : null,
    description: priceDescription(emojiString, price),
    color: VAL_COLOR_2,
    thumbnail: {
      url: spray.icon,
    },
  };
}

async function titleEmbed(uuid, price, locale, emojiString) {
  const title = await getTitle(uuid);
  return {
    title: l(title.names, locale),
    description:
      "`" +
      l(title.text, locale) +
      "`\n\n" +
      (priceDescription(emojiString, price) || ""),
    color: VAL_COLOR_2,
  };
}

async function skinCollectionSingleEmbed(
  interaction,
  id,
  user,
  { loadout, favorites }
) {
  const someoneElseUsedCommand = interaction.message
    ? interaction.message.interaction &&
      interaction.message.interaction.user.id !== user.id
    : interaction.user.id !== user.id;

  let totalValue = 0;
  const skinsUuid = [];
  const createField = async (weaponUuid, inline = true) => {
    const weapon = await getWeapon(weaponUuid);
    const skinUuid = loadout.Guns.find((gun) => gun.ID === weaponUuid)?.SkinID;
    if (!skinUuid)
      return {
        name: "No information available",
        value: "Login to the game for display",
        inline: inline,
      };
    const skin = await getSkinFromSkinUuid(skinUuid);
    skinsUuid.push(skin);
    totalValue += skin.price;

    const starEmoji = favorites.FavoritedContent[skin.skinUuid] ? "⭐ " : "";
    return {
      name: l(weapon.names, interaction),
      value: `${starEmoji}${await skinNameAndEmoji(
        skin,
        interaction.channel,
        interaction
      )}`,
      inline: inline,
    };
  };

  const emptyField = {
    name: "\u200b",
    value: "\u200b",
    inline: true,
  };

  const fields = [
    await createField(WeaponTypeUuid.Vandal),
    await createField(WeaponTypeUuid.Phantom),
    await createField(WeaponTypeUuid.Operator),

    await createField(WeaponTypeUuid.Knife),
    await createField(WeaponTypeUuid.Sheriff),
    await createField(WeaponTypeUuid.Spectre),

    await createField(WeaponTypeUuid.Classic),
    await createField(WeaponTypeUuid.Ghost),
    await createField(WeaponTypeUuid.Frenzy),

    await createField(WeaponTypeUuid.Bulldog),
    await createField(WeaponTypeUuid.Guardian),
    await createField(WeaponTypeUuid.Marshal),

    await createField(WeaponTypeUuid.Outlaw),

    await createField(WeaponTypeUuid.Stinger),
    await createField(WeaponTypeUuid.Ares),
    await createField(WeaponTypeUuid.Odin),

    await createField(WeaponTypeUuid.Shorty),
    await createField(WeaponTypeUuid.Bucky),
    await createField(WeaponTypeUuid.Judge),
  ];

  const emoji = await VPEmoji(interaction);
  fields.push(
    emptyField,
    {
      name: s(interaction).info.COLLECTION_VALUE,
      value: `${emoji} ${totalValue}`,
      inline: true,
    },
    emptyField
  );

  let usernameText;
  if (someoneElseUsedCommand) {
    usernameText = `<@${id}>`;

    const json = readUserJson(id);
    if (json.accounts.length > 1)
      usernameText +=
        " " +
        s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: json.currentAccount });
  } else usernameText = user.username;

  const embed = {
    description: s(interaction).info.COLLECTION_HEADER.f(
      { u: usernameText },
      id
    ),
    color: VAL_COLOR_1,
    fields: fields,
  };

  const components = [
    new ActionRowBuilder().addComponents(
      collectionSwitchEmbedButton(interaction, true, id)
    ),
  ];
  if (!someoneElseUsedCommand)
    components.push(
      ...switchAccountButtons(interaction, "cl", false, false, id)
    );

  const levels = await getSkinLevels(
    skinsUuid.map((item) => item.uuid),
    interaction
  );
  if (levels) components.unshift(levels);

  return {
    embeds: [embed],
    components: components,
  };
}

async function skinCollectionPageEmbed(
  interaction,
  id,
  user,
  { loadout, favorites },
  pageIndex = 0
) {
  const someoneElseUsedCommand = interaction.message
    ? interaction.message.interaction &&
      interaction.message.interaction.user.id !== user.id
    : interaction.user.id !== user.id;

  let totalValue = 0;
  const emoji = await VPEmoji(interaction);

  const createEmbed = async (weaponUuid) => {
    const weapon = await getWeapon(weaponUuid);
    const skinUuid = loadout.Guns.find((gun) => gun.ID === weaponUuid)?.SkinID;
    if (!skinUuid)
      return {
        title: "No information available",
        description: "Login to the game for display",
        color: VAL_COLOR_1,
      };
    const skin = await getSkinFromSkinUuid(skinUuid);
    totalValue += skin.price;

    const starEmoji = favorites.FavoritedContent[skin.skinUuid] ? " ⭐" : "";
    return {
      title: l(weapon.names, interaction),
      description: `**${await skinNameAndEmoji(
        skin,
        interaction.channel,
        interaction
      )}**${starEmoji}\n${emoji} ${skin.price || "N/A"}`,
      color: VAL_COLOR_2,
      thumbnail: {
        url: skin.icon,
      },
    };
  };

  const pages = [
    [
      WeaponTypeUuid.Vandal,
      WeaponTypeUuid.Phantom,
      WeaponTypeUuid.Operator,
      WeaponTypeUuid.Outlaw,
      WeaponTypeUuid.Knife,
    ],
    [
      WeaponTypeUuid.Classic,
      WeaponTypeUuid.Sheriff,
      WeaponTypeUuid.Spectre,
      WeaponTypeUuid.Marshal,
    ],
    [
      WeaponTypeUuid.Frenzy,
      WeaponTypeUuid.Ghost,
      WeaponTypeUuid.Bulldog,
      WeaponTypeUuid.Guardian,
    ],
    [WeaponTypeUuid.Shorty, WeaponTypeUuid.Bucky, WeaponTypeUuid.Judge],
    [WeaponTypeUuid.Stinger, WeaponTypeUuid.Ares, WeaponTypeUuid.Odin],
  ];

  if (pageIndex < 0) pageIndex = pages.length - 1;
  if (pageIndex >= pages.length) pageIndex = 0;

  let usernameText;
  if (someoneElseUsedCommand) {
    usernameText = `<@${id}>`;

    const json = readUserJson(id);
    if (json.accounts.length > 1)
      usernameText +=
        " " +
        s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: json.currentAccount });
  } else usernameText = user.username;

  const embeds = [
    basicEmbed(
      s(interaction).info.COLLECTION_HEADER.f({ u: usernameText }, id)
    ),
  ];
  for (const weapon of pages[pageIndex]) {
    embeds.push(await createEmbed(weapon));
  }

  const firstRowButtons = [collectionSwitchEmbedButton(interaction, false, id)];
  firstRowButtons.push(
    ...pageButtons("clpage", id, pageIndex, pages.length).components
  );

  const components = [new ActionRowBuilder().setComponents(...firstRowButtons)];
  if (!someoneElseUsedCommand)
    components.push(
      ...switchAccountButtons(interaction, "cl", false, false, id)
    );

  return { embeds, components };
}

function collectionSwitchEmbedButton(interaction, switchToPage, id) {
  const label =
    s(interaction).info[
      switchToPage ? "COLLECTION_VIEW_IMAGES" : "COLLECTION_VIEW_ALL"
    ];
  const customId = `clswitch/${switchToPage ? "p" : "s"}/${id}`;
  return new ButtonBuilder()
    .setEmoji("🔍")
    .setLabel(label)
    .setStyle(ButtonStyle.Primary)
    .setCustomId(customId);
}

async function collectionOfWeaponEmbed(
  interaction,
  id,
  user,
  weaponTypeUuid,
  skins,
  pageIndex = 0
) {
  const someoneElseUsedCommand = interaction.message
    ? interaction.message.interaction &&
      interaction.message.interaction.user.id !== user.id
    : interaction.user.id !== user.id;

  const emoji = await VPEmoji(interaction);

  let usernameText;
  if (someoneElseUsedCommand) {
    usernameText = `<@${id}>`;

    const json = readUserJson(id);
    if (json.accounts.length > 1)
      usernameText +=
        " " +
        s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: json.currentAccount });
  } else usernameText = user.username;

  // note: some of these are null for some reason
  const skinsData = await Promise.all(
    skins.map((skinUuid) => getSkin(skinUuid, false))
  );
  const filteredSkins = skinsData.filter(
    (skin) => skin?.weapon === weaponTypeUuid
  );
  filteredSkins.sort((a, b) => {
    // sort by price, then rarity
    const priceDiff = (b.price || 0) - (a.price || 0);
    if (priceDiff !== 0) return priceDiff;

    const rarityOrder = [
      "12683d76-48d7-84a3-4e09-6985794f0445", // select
      "0cebb8be-46d7-c12a-d306-e9907bfc5a25", // deluxe
      "60bca009-4182-7998-dee7-b8a2558dc369", // premium
      "411e4a55-4e59-7757-41f0-86a53f101bb5", // ultra
      "e046854e-406c-37f4-6607-19a9ba8426fc", // exclusive
    ];
    return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
  });

  const embedsPerPage = 5;
  const maxPages = Math.ceil(filteredSkins.length / embedsPerPage);

  if (pageIndex < 0) pageIndex = maxPages - 1;
  if (pageIndex >= maxPages) pageIndex = 0;

  const weaponName = await getWeapon(weaponTypeUuid).then((weapon) =>
    l(weapon.names, interaction)
  );
  const embeds = [
    basicEmbed(
      s(interaction).info.COLLECTION_WEAPON_HEADER.f(
        { u: usernameText, w: weaponName, p: pageIndex + 1, t: maxPages },
        id
      )
    ),
  ];
  const skinEmbed = async (skin) => ({
    title: await skinNameAndEmoji(skin, interaction.channel, interaction),
    description: `${emoji} ${skin.price || "N/A"}`,
    color: VAL_COLOR_2,
    thumbnail: {
      url: skin.icon,
    },
  });
  if (filteredSkins.length === 0) {
    const weapon = await getWeapon(weaponTypeUuid);
    const skin = await getSkinFromSkinUuid(weapon.defaultSkinUuid);
    embeds.push(await skinEmbed(skin));
  } else
    for (const skin of filteredSkins.slice(
      pageIndex * embedsPerPage,
      (pageIndex + 1) * embedsPerPage
    )) {
      embeds.push(await skinEmbed(skin));
    }

  const weaponTypeIndex = Object.values(WeaponTypeUuid).indexOf(weaponTypeUuid);

  const actionRows = [];
  if (maxPages > 1)
    actionRows.push(
      pageButtons(`clwpage/${weaponTypeIndex}`, id, pageIndex, maxPages)
    );
  if (!someoneElseUsedCommand)
    actionRows.push(
      ...switchAccountButtons(
        interaction,
        `clw-${weaponTypeIndex}`,
        false,
        false,
        id
      )
    );

  const levels = await getSkinLevels(
    filteredSkins
      .slice(pageIndex * embedsPerPage, (pageIndex + 1) * embedsPerPage)
      .map((item) => item.uuid),
    interaction
  );
  if (levels) actionRows.unshift(levels);

  return { embeds, components: actionRows };
}

function botInfoEmbed(
  interaction,
  client,
  guildCount,
  userCount,
  registeredUserCount,
  ownerString,
  status
) {
  const fields = [
    {
      name: s(interaction).info.INFO_SERVERS,
      value: guildCount.toString(),
      inline: true,
    },
    {
      name: s(interaction).info.INFO_MEMBERS,
      value: userCount.toString(),
      inline: true,
    },
    {
      name: s(interaction).info.INFO_REGISTERED,
      value: registeredUserCount.toString(),
      inline: true,
    },
    {
      name: ":dog2:",
      value: s(interaction).info.INFO_WOOF,
      inline: true,
    },
    {
      name: s(interaction).info.INFO_SOURCE,
      value:
        "[SkinPeek](https://github.com/giorgi-o/SkinPeek) by [Giorgio](https://github.com/giorgi-o)",
      inline: true,
    },
  ];
  if (ownerString)
    fields.push({
      name: s(interaction).info.INFO_OWNER,
      value: ownerString || "Giorgio#0609",
      inline: true,
    });
  if (interaction.client.shard)
    fields.push({
      name: "Running on shard",
      value: interaction.client.shard.ids.join(" ") || "No shard id...?",
      inline: true,
    });
  if (status)
    fields.push({
      name: s(interaction).info.INFO_STATUS,
      value: status || "Up and running!",
      inline: true,
    });

  const readyTimestamp = Math.round(client.readyTimestamp / 1000);

  return {
    embeds: [
      {
        title: s(interaction).info.INFO_HEADER,
        description: s(interaction).info.INFO_RUNNING.f({
          t1: readyTimestamp,
          t2: readyTimestamp,
        }),
        color: VAL_COLOR_1,
        fields: fields,
      },
    ],
  };
}
function competitiveMatchEmbed(interaction, matchData) {
  const embedTitle = `${s(interaction).match.COMPETITIVE}┊${
    matchData.metadata.map
  }・<t:${matchData.metadata.game_start + matchData.metadata.game_length}:R>`;
  const roundDesc = `[**${matchData.metadata.pt_round_won}** : **${matchData.metadata.et_round_won}**]`;
  const hsPercentDesc = `**${s(interaction).match.PERCENT.f({
    v: matchData.player.hs_percent,
  })}** ${s(interaction).match.HS_PERCENT}`;
  const adsDesc = `**${matchData.player.average_damage_round}** ${
    s(interaction).match.AVERAGE_DAMAGE_ROUND
  }`;
  const acsDesc = `**${matchData.player.average_combat_score}** ${
    s(interaction).match.AVERAGE_COMBAT_SCORE
  }`;
  const colors = {
    red: 13195866,
    grey: 9145227,
    green: 7654512,
  };
  let embedColor;
  if (matchData.teams.red.has_won === true) {
    if (matchData.player.team === "Red") {
      embedColor = colors.green;
    } else embedColor = colors.red;
  } else if (matchData.teams.blue.has_won === true) {
    if (matchData.player.team === "Blue") {
      embedColor = colors.green;
    } else embedColor = colors.red;
  } else {
    embedColor = colors.grey;
  }

  const mapDesc = `**${"`" + matchData.player.mmr + "`"}**`;
  const embedDescription = `${mapDesc}・${roundDesc}・${hsPercentDesc}・${adsDesc}・${acsDesc}`;
  const embed = {
    title: embedTitle,
    description: embedDescription,
    color: embedColor,
    author: {
      name: `${matchData.player.agent.name}・${matchData.player.kills} / ${matchData.player.deaths} / ${matchData.player.assists}・${matchData.player.kd} KD┊${matchData.player.position}`,
      icon_url: matchData.player.agent.iconUrl,
    } /*,
          "thumbnail": {
              "url": matchData.player.currentTierImageUrl
          }*/,
  };

  return embed;
}

async function renderCompetitiveMatchHistory(
  interaction,
  accountData,
  matchHistoryData,
  targetId = interaction.user.id
) {
  //will be edited in the future
  if (!accountData.success)
    return {
      embeds: [
        basicEmbed(
          s(interaction).error.GENERIC_ERROR.f({ e: accountData.error })
        ),
      ],
    };
  if (!matchHistoryData.success)
    return {
      embeds: [
        basicEmbed(
          s(interaction).error.GENERIC_ERROR.f({ e: matchHistoryData.error })
        ),
      ],
    };
  const account = accountData.data;
  const userName = hideUsername(
    { u: account.account.name + "`#" + account.account.tag + "`" },
    targetId
  ).u;
  const embeds = [
    {
      title: userName + ` • Lv. ${account.account.account_level}`,
      description: `${s(interaction).info.PROFILE_PEAK_RANK} ┊ **${
        account.mmr.highest_rank?.patched_tier
      }**`,
      color: 16632621, //TODO color according to account level
      author: {
        name:
          interaction.user.username +
          ` • ${account.mmr.current_data.ranking_in_tier} RR`,
        icon_url: account.mmr.current_data.images.large,
      },
      thumbnail: {
        url: account.account.card?.small,
      },
    },
  ];
  for (let i = 0; i < matchHistoryData.data.length; i++) {
    const embed = competitiveMatchEmbed(interaction, matchHistoryData.data[i]);
    embeds.push(embed);
  }
  const rows = switchAccountButtons(
    interaction,
    "comphistory",
    true,
    false,
    targetId
  );
  return { embeds: embeds, components: rows };
}

async function renderProfile(
  interaction,
  data1,
  targetId = interaction.user.id
) {
  //will be edited in the future
  if (!data1.success)
    return {
      embeds: [
        basicEmbed(s(interaction).error.GENERIC_ERROR.f({ e: data1.error })),
      ],
    };
  const valorantUser = getUser(targetId);
  const data = data1.data;
  const userName = hideUsername(
    { u: data.account.name + "`#" + data.account.tag + "`" },
    targetId
  ).u;
  const embeds = [
    {
      title: userName + ` • Lv. ${data.account.account_level}`,
      description: `${s(interaction).info.PROFILE_PEAK_RANK} ┊ **${
        data.mmr.highest_rank?.patched_tier
      }**`,
      color: 16632621, //TODO color according to account level
      author: {
        name:
          interaction.user.username +
          ` • ${data.mmr.current_data.ranking_in_tier} RR`,
        icon_url: data.mmr.current_data.images.large,
      },
      thumbnail: {
        url: data.account.card?.small,
      },
    },
  ];

  if (notice && valorantUser) {
    // users shouldn't see the same notice twice
    if (!onlyShowNoticeOnce || valorantUser.lastNoticeSeen !== notice) {
      // the notice can either be just a simple string, or a raw JSON embed data object
      if (typeof notice === "string") {
        if (notice.startsWith("{"))
          embeds.push(EmbedBuilder.from(JSON.parse(notice)).toJSON());
        else embeds.push(basicEmbed(notice));
      } else embeds.push(EmbedBuilder.from(notice).toJSON());

      valorantUser.lastNoticeSeen = notice;
      saveUser(valorantUser);
    }
  }

  const rows = profileButtons(interaction, targetId);
  switchAccountButtons(interaction, "profile", true, false, targetId).map((a) =>
    rows.push(a)
  );

  return { embeds: embeds, components: rows };
}

function profileButtons(interaction, id, back = false) {
  if (back) {
    // not implemented yet
    const returnButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel(s(interaction).info.RETURN_BUTTON)
      .setEmoji("↩️")
      .setCustomId(`account/profile/${id}/c`);
    return [new ActionRowBuilder().setComponents(returnButton)];
  }
  const shopButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel(s(interaction).info.DAILY_SHOP_SWITCH_BUTTON)
    .setEmoji("🛒")
    .setCustomId(`account/shop/${id}/daily`);

  const nightMarketButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Danger)
    .setLabel(s(interaction).info.NIGHT_MARKET_BUTTON)
    .setEmoji("🌑")
    .setDisabled(!isThereANM()) // should be working
    .setCustomId(`account/nm/${id}/c`);

  const battlepassButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setLabel(s(interaction).info.BATTLEPASS_BUTTON)
    .setEmoji("🗓️")
    .setCustomId(`account/bp/${id}/c`);

  const collectionButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel(s(interaction).info.COLLECTION_BUTTON)
    .setEmoji("🔫")
    .setCustomId(`account/cl/${id}/c`);

  const competitiveHistoryButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Primary)
    .setLabel(s(interaction).info.COMPETITIVE_HISTORY_BUTTON)
    .setEmoji("⚔️")
    .setCustomId(`account/comphistory/${id}/c`);

  const row1 = new ActionRowBuilder().setComponents(
    shopButton,
    nightMarketButton,
    battlepassButton,
    collectionButton,
    competitiveHistoryButton
  );
  const rows = [row1];

  return rows;
}

function ownerMessageEmbed(messageContent, author) {
  return {
    title: "Message from bot owner:",
    description: messageContent,
    color: VAL_COLOR_3,
    footer: {
      text: "By " + author.username,
      icon_url: author.displayAvatarURL(),
    },
  };
}

function priceDescription(VPemojiString, price) {
  if (price) return `${VPemojiString} ${price}`;
}

function pageButtons(pageId, userId, current, max) {
  const leftButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("◀")
    .setCustomId(`${pageId}/${userId}/${current - 1}`);
  const rightButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("▶")
    .setCustomId(`${pageId}/${userId}/${current + 1}`);
  const goToPageButton = new ButtonBuilder()
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🔍")
    .setCustomId(`gotopage/${pageId}/${userId}/${max}`);

  if (current === 0) leftButton.setEmoji("⏪");
  if (current === max - 1) rightButton.setEmoji("⏩");

  return new ActionRowBuilder().setComponents(
    leftButton,
    rightButton,
    goToPageButton
  );
}

function switchAccountButtons(
  interaction,
  customId,
  oneAccountButton = false,
  accessory = false,
  id = interaction?.user?.id || interaction
) {
  const json = removeDupeAccounts(id);
  if (!json || (json.accounts.length === 1 && !oneAccountButton)) return [];
  const accountNumbers = [...Array(json.accounts.length).keys()]
    .map((n) => n + 1)
    .slice(0, maxAccountsPerUser <= 10 ? maxAccountsPerUser : 10);
  const hideIgn = getSetting(id, "hideIgn");

  const rows = []; // action rows
  const buttons = []; // account switch buttons, row 1
  const buttons2 = []; // account switch buttons, row 2

  for (const number of accountNumbers) {
    const username =
      json.accounts[number - 1].username || s(interaction).info.NO_USERNAME;
    const label = hideIgn
      ? s(interaction).info.SWITCH_ACCOUNT_BUTTON.f({ n: number.toString() })
      : username;

    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Secondary)
      .setLabel(label)
      .setCustomId(`account/${customId}/${id}/${number}`);
    button.setDisabled(number === json.currentAccount);

    number > 5 ? buttons2.push(button) : buttons.push(button);
  }

  // accessory/shop buttons
  // the "accessory" parameter represents the current page of the embed.
  // it can be either "daily" for the skin shop, "accessory" for the accessory shop.
  // it can also be "false" to not render this row.
  if (accessory !== false) {
    const skinShopButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel(s(interaction).info.DAILY_SHOP_SWITCH_BUTTON)
      .setEmoji("🛒")
      .setCustomId(`account/shop/${id}/daily`);
    const accessoryShopButton = new ButtonBuilder()
      .setStyle(ButtonStyle.Primary)
      .setLabel(s(interaction).info.ACCESSORY_SHOP_SWITCH_BUTTON)
      .setEmoji("🎩")
      .setCustomId(`account/accessoryshop/${id}/accessory`);

    if (accessory === "daily") skinShopButton.setDisabled(true);
    else if (accessory === "accessory") accessoryShopButton.setDisabled(true);

    const row = new ActionRowBuilder().setComponents(
      skinShopButton,
      accessoryShopButton
    );
    rows.push(row);
  }

  rows.push(new ActionRowBuilder().setComponents(...buttons));
  if (buttons2.length)
    rows.push(new ActionRowBuilder().setComponents(...buttons2));
  return rows;
}

async function alertFieldDescription(
  interaction,
  channel_id,
  emojiString,
  price
) {
  if (channel_id === interaction.channelId) {
    if (price) return `${emojiString} ${price}`;
    if (fetchSkinPrices) return s(interaction).info.SKIN_NOT_FOR_SALE;
    return s(interaction).info.SKIN_PRICES_HIDDEN;
  } else {
    const channel = await fetchChannel(channel_id);
    if (channel && !channel.guild)
      return s(interaction).info.ALERT_IN_DM_CHANNEL;
    return s(interaction).info.ALERT_IN_CHANNEL.f({ c: channel_id });
  }
}

async function alertsPageEmbed(interaction, alerts, pageIndex, emojiString) {
  const components = switchAccountButtons(interaction, "alerts");

  alerts = alerts.filter((alert) => alert.uuid);

  if (alerts.length === 0) {
    return {
      embeds: [basicEmbed(s(interaction).error.NO_ALERTS)],
      components: components,
    };
  }

  if (alerts.length === 1) {
    const alert = alerts[0];

    const skin = await getSkin(alert.uuid);

    return {
      embeds: [
        {
          title: s(interaction).info.ONE_ALERT,
          color: VAL_COLOR_1,
          description: `**${await skinNameAndEmoji(
            skin,
            interaction.channel,
            interaction
          )}**\n${await alertFieldDescription(
            interaction,
            alert.channel_id,
            emojiString,
            skin.price
          )}`,
          thumbnail: {
            url: skin.icon,
          },
        },
      ],
      components: [
        removeAlertActionRow(
          interaction.user.id,
          alert.uuid,
          s(interaction).info.REMOVE_ALERT_BUTTON
        ),
      ].concat(components),
      ephemeral: true,
    };
  }

  const maxPages = Math.ceil(alerts.length / alertsPerPage);

  if (pageIndex < 0) pageIndex = maxPages - 1;
  if (pageIndex >= maxPages) pageIndex = 0;

  const embed = {
    // todo switch this to a "one embed per alert" message, kinda like /shop
    title: s(interaction).info.MULTIPLE_ALERTS,
    color: VAL_COLOR_1,
    footer: {
      text: s(interaction).info.REMOVE_ALERTS_FOOTER,
    },
    fields: [],
  };
  const buttons = [];

  let n = pageIndex * alertsPerPage;
  const alertsToRender = alerts.slice(n, n + alertsPerPage);
  for (const alert of alertsToRender) {
    const skin = await getSkin(alert.uuid);
    embed.fields.push({
      name: `**${n + 1}.** ${await skinNameAndEmoji(
        skin,
        interaction.channel,
        interaction
      )}`,
      value: await alertFieldDescription(
        interaction,
        alert.channel_id,
        emojiString,
        skin.price
      ),
      inline: alerts.length > 5,
    });
    buttons.push(
      removeAlertButton(interaction.user.id, alert.uuid, `${n + 1}.`)
    );
    n++;
  }

  const actionRows = [];
  for (let i = 0; i < alertsToRender.length; i += 5) {
    const actionRow = new ActionRowBuilder();
    for (let j = i; j < i + 5 && j < alertsToRender.length; j++) {
      actionRow.addComponents(buttons[j]);
    }
    actionRows.push(actionRow);
  }
  if (maxPages > 1)
    actionRows.push(
      pageButtons("changealertspage", interaction.user.id, pageIndex, maxPages)
    );

  if (actionRows.length < 5) actionRows.push(...components);

  return {
    embeds: [embed],
    components: actionRows,
  };
}

async function alertTestResponse(interaction, success) {
  if (success) {
    await interaction.followUp({
      embeds: [secondaryEmbed(s(interaction).info.ALERT_TEST_SUCCESSFUL)],
    });
  } else {
    await interaction.followUp({
      embeds: [basicEmbed(s(interaction).error.ALERT_NO_PERMS)],
    });
  }
}

async function allStatsEmbed(interaction, stats, pageIndex = 0) {
  const skinCount = Object.keys(stats.items).length;

  if (skinCount === 0)
    return {
      embeds: [
        basicEmbed(
          trackStoreStats
            ? s(interaction).error.EMPTY_STATS
            : s(interaction).error.STATS_DISABLED
        ),
      ],
    };

  const maxPages = Math.ceil(skinCount / statsPerPage);

  if (pageIndex < 0) pageIndex = maxPages - 1;
  if (pageIndex >= maxPages) pageIndex = 0;

  const skinsToDisplay = Object.keys(stats.items).slice(
    pageIndex * statsPerPage,
    pageIndex * statsPerPage + statsPerPage
  );
  const embeds = [
    basicEmbed(
      s(interaction).info.STATS_HEADER.f({
        c: stats.shopsIncluded,
        p: pageIndex + 1,
        t: maxPages,
      })
    ),
  ];
  for (const uuid of skinsToDisplay) {
    const skin = await getSkin(uuid);
    const statsForSkin = getStatsFor(uuid);
    embeds.push(await statsForSkinEmbed(skin, statsForSkin, interaction));
  }

  return {
    embeds: embeds,
    components: [
      pageButtons("changestatspage", interaction.user.id, pageIndex, maxPages),
    ],
  };
}

async function statsForSkinEmbed(skin, stats, interaction) {
  let description;
  if (stats.count === 0)
    description = s(interaction).error.NO_STATS_FOR_SKIN.f({
      d: statsExpirationDays || "∞",
    });
  else {
    const percentage =
      Math.round((stats.count / stats.shopsIncluded) * 100 * 100) / 100;
    const crownEmoji =
      stats.rank[0] === 1 || stats.rank[0] === stats.rank[1] ? ":crown: " : "";
    description = s(interaction).info.STATS_DESCRIPTION.f({
      c: crownEmoji,
      r: stats.rank[0],
      t: stats.rank[1],
      p: percentage,
    });
  }

  return {
    title: await skinNameAndEmoji(skin, interaction.channel, interaction),
    description: description,
    color: VAL_COLOR_2,
    thumbnail: {
      url: skin.icon,
    },
  };
}

function accountsListEmbed(interaction, userJson) {
  const fields = [];
  for (const [i, account] of Object.entries(userJson.accounts)) {
    let fieldValue;
    if (!account.username) fieldValue = s(interaction).info.NO_USERNAME;
    else fieldValue = account.username;

    fields.push({
      name: `${parseInt(i) + 1}. ${
        userJson.currentAccount === parseInt(i) + 1
          ? s(interaction).info.ACCOUNT_CURRENTLY_SELECTED
          : ""
      }`,
      value: fieldValue,
      inline: true,
    });
  }

  const hideIgn = getSetting(interaction.user.id, "hideIgn");

  return {
    embeds: [
      {
        title: s(interaction).info.ACCOUNTS_HEADER,
        fields: fields,
        color: VAL_COLOR_1,
      },
    ],
    ephemeral: hideIgn,
  };
}

function settingsEmbed(userSettings, interaction) {
  const embed = {
    title: s(interaction).settings.VIEW_HEADER,
    description: s(interaction).settings.VIEW_DESCRIPTION,
    color: VAL_COLOR_1,
    fields: [],
  };

  for (const [setting, value] of Object.entries(userSettings)) {
    if (!settingIsVisible(setting)) continue;

    let displayValue = humanifyValue(
      setting === "locale" && !userSettings.localeForced ? "Automatic" : value,
      setting,
      interaction,
      true
    );

    embed.fields.push({
      name: settingName(setting, interaction),
      value: displayValue,
      inline: true,
    });
  }

  return {
    embeds: [embed],
  };
}

function valMaintenancesEmbeds(
  interaction,
  { maintenances, incidents, id: regionName }
) {
  const embeds = [];
  for (const maintenance of maintenances) {
    embeds.push(
      valMaintenanceEmbed(interaction, maintenance, false, regionName)
    );
  }
  for (const incident of incidents) {
    embeds.push(valMaintenanceEmbed(interaction, incident, true, regionName));
  }

  if (!embeds.length) {
    embeds.push(
      basicEmbed(s(interaction).info.NO_MAINTENANCES.f({ r: regionName }))
    );
  }

  return {
    embeds: embeds,
  };
}

function valMaintenanceEmbed(interaction, target, isIncident, regionName) {
  const update = target.updates[0] || {};
  const strings = update.translations || target.titles;
  const string = (
    strings.find(
      (s) =>
        s.locale.replace("_", "-") ===
        (discToValLang[interaction.locale] || DEFAULT_VALORANT_LANG)
    ) || strings[0]
  ).content;
  const lastUpdate = Math.round(
    new Date(update.created_at || target.created_at) / 1000
  );
  const targetType = isIncident
    ? s(interaction).info.INCIDENT_TYPE
    : s(interaction).info.MAINTENANCE_TYPE;

  return {
    title: s(interaction).info.MAINTENANCE_HEADER.f({
      t: targetType,
      r: regionName,
    }),
    description: `> ${string}\n*${s(interaction).info.LAST_UPDATED.f({
      t: lastUpdate,
    })}*`,
  };
}

function basicEmbed(content) {
  return {
    description: content,
    color: VAL_COLOR_1,
  };
}

function headerEmbed(content) {
  return {
    description: content,
    color: 0x202225,
  };
}

function secondaryEmbed(content) {
  return {
    description: content,
    color: VAL_COLOR_2,
  };
}

function createProgressBar(totalxpneeded, currentxp, level) {
  const totalxp =
    parseFloat(totalxpneeded.replace(/[,\.]/g, "")) +
    parseFloat(String(currentxp).replace(/[,\.]/g, "")); // I don't know why, but in the country I was in, the data had "." instead of ","

  const totalBars = 14; // Total number of bars and circles
  const filledBars = Math.floor((currentxp / totalxp) * totalBars);
  const emptyBars = totalBars - filledBars;

  const line = "▬";
  const circle = "⬤";

  const bar = line.repeat(filledBars) + circle + line.repeat(emptyBars);

  return level + "┃" + bar + "┃" + (parseInt(level) + 1);
}

const localiseText = true;
const localiseSkinNames = true;

const discToValLang = {
  de: "de-DE",
  "en-GB": "en-US", // :(
  "en-US": "en-US",
  "es-ES": "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pl: "pl-PL",
  "pt-BR": "pt-BR",
  vi: "vi-VN",
  tr: "tr-TR",
  ru: "ru-RU",
  th: "th-TH",
  "zh-CN": "zh-CN",
  ja: "ja-JP",
  "zh-TW": "zh-TW",
  ko: "ko-KR",

  // valorant languages, that discord doesn't support
  "ar-AE": "ar-AE",
  "es-MX": "es-MX",
  "id-ID": "id-ID",
};

const valToDiscLang = {};
Object.keys(discToValLang).forEach((discLang) => {
  valToDiscLang[discToValLang[discLang]] = discLang;
});
const discLanguageNames = {
  de: "🇳🇱 Deutsch",
  "en-GB": "🇬🇧 English (UK)",
  "en-US": "🇺🇸 English (US)",
  "es-ES": "🇪🇸 Español",
  fr: "🇫🇷 Français",
  it: "🇮🇹 Italiano",
  pl: "🇵🇱 Polski",
  "pt-BR": "🇧🇷 Português (Brasil)",
  vi: "🇻🇳 Tiếng Việt",
  tr: "🇹🇷 Türkçe",
  ru: "🇷🇺 Русский",
  th: "🇹🇭 ไทย",
  "zh-CN": "🇨🇳 简体中文",
  ja: "🇯🇵 日本語",
  "zh-TW": "🇹🇼 繁體中文",
  ko: "🇰🇷 한국어",

  // valorant languages, that discord doesn't support
  "ar-AE": "🇸🇦 العربية",
  "es-MX": "🇲🇽 Español (México)",
  "id-ID": "🇮🇩 Bahasa Indonesia",

  // languages that neither discord nor valorant support
  "tl-PH": "🇵🇭 Tagalog",
};

const DEFAULT_LANG = "en-GB";
const DEFAULT_VALORANT_LANG = "en-US";

const languages = {};

function importLanguage(language) {
  let languageStrings;
  try {
    languageStrings = JSON.parse(
      fs.readFileSync(`./languages/${language}.json`, "utf-8")
    );
  } catch (e) {
    if (language === DEFAULT_LANG)
      console.error(`Couldn't load ${DEFAULT_LANG}.json! Things will break.`);
    return;
  }

  if (language === DEFAULT_LANG) {
    languages[language] = languageStrings;
    return;
  }

  const languageHandler = {};
  for (const category in languageStrings) {
    if (typeof languageStrings[category] !== "object") continue;
    languageHandler[category] = new Proxy(languageStrings[category], {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        return languages[DEFAULT_LANG][category][prop] || prop;
      },
    });
  }

  for (const category in languages[DEFAULT_LANG]) {
    if (!languageHandler[category])
      languageHandler[category] = languages[DEFAULT_LANG][category];
  }

  languages[language] = languageHandler;
}
importLanguage(DEFAULT_LANG);

// Modification de l'extension de String.prototype n'est pas recommandée en général.
// Considérez l'utilisation d'une fonction externe pour la manipulation des chaînes.
String.prototype.f = function (args, interactionOrId = null, hideName = true) {
  args = hideUsername(args, interactionOrId, hideName);
  let str = this;
  for (let i in args) str = str.replace(`{${i}}`, args[i]);
  return str;
};

function s(input) {
  const discLang = localiseText ? resolveDiscordLanguage(input) : DEFAULT_LANG;

  if (!languages[discLang]) importLanguage(discLang);
  return languages[discLang] || languages[DEFAULT_LANG];
}

function l(names, input) {
  let discLocale = localiseSkinNames
    ? resolveDiscordLanguage(input)
    : DEFAULT_LANG;
  let valLocale = discToValLang[discLocale];
  return names[valLocale] || names[DEFAULT_VALORANT_LANG];
}

function resolveDiscordLanguage(input) {
  let discLang;

  if (!input) discLang = DEFAULT_LANG;
  if (typeof input === "string") {
    const user = getUser(input);
    if (user) input = user;
    else discLang = input;
  }
  if (input instanceof User) discLang = getSetting(input.id, "locale");
  if (input instanceof BaseInteraction)
    discLang = getSetting(input.user.id, "locale");

  if (discLang === "Automatic") discLang = input.locale;
  if (!discLang) discLang = DEFAULT_LANG;

  return discLang;
}

function hideUsername(args, interactionOrId, hideName = true) {
  if (!args.u) return { ...args, u: s(interactionOrId).info.NO_USERNAME };
  if (!interactionOrId) return args;

  const id =
    typeof interactionOrId === "string"
      ? interactionOrId
      : interactionOrId.user.id;
  const hide = hideName ? getSetting(id, "hideIgn") : false;
  if (!hide) return args;

  return { ...args, u: `||*${s(interactionOrId).info.HIDDEN_USERNAME}*||` };
}

const useMultiqueue = false;

let mqMessageId = 0;
const callbacks = {};
function setCallback(mqid, callback) {
  callbacks[parseInt(mqid)] = callback;
}

async function sendMQRequest(type, params = {}, callback = () => {}) {
  const mqid = `${++mqMessageId}`;
  setCallback(mqMessageId, callback);
  // Ici, au lieu d'envoyer un message à travers les shards, nous traiterons directement la requête.
  console.log(`Request of type '${type}' added to queue with mqid ${mqid}`);
  // Directement appeler la fonction de traitement pour simuler une réponse
  setTimeout(() => callback({ mqid, params }), 0); // Utiliser un délai de 0 pour simuler une réponse asynchrone
}

async function sendMQResponse(mqid, params = {}) {
  // Simuler l'envoi d'une réponse en appelant directement le callback enregistré pour mqid.
  if (callbacks[mqid]) {
    callbacks[mqid]({ params });
    delete callbacks[mqid]; // Supprimer le callback une fois appelé pour nettoyer.
  } else {
    console.log(
      `Aucun callback trouvé pour mqid: ${mqid}, impossible d'envoyer une réponse.`
    );
  }
}

async function handleMQRequest(message) {
  await mqProcessRequest(message);
}

async function handleMQResponse(message) {
  const mqid = message.mqid;

  // check we have a callback registered
  if (!callbacks[mqid])
    return console.error(
      `No callback registered for MQ response ${message.mqid}!`
    );

  // call the callback function with the message
  callbacks[mqid](message);
  delete callbacks[mqid];
}

async function mqSendMessage(type, params = {}) {
  return new Promise((resolve, reject) => {
    sendMQRequest(type, params, (message) => {
      if (message.error) reject(message.error);
      else resolve(message.params);
    });
  });
}

async function mqProcessRequest({ mqid, mqtype, params }) {
  console.log(
    "Processing MQ request",
    mqid,
    mqtype,
    JSON.stringify(params).substring(0, 200)
  );

  let response;
  switch (mqtype) {
    case "getShop": {
      const { id, account } = params;
      response = await getShop(id, account);
      break;
    }

    case "loginUsernamePass": {
      const { id, username, password } = params;
      response = await queueUsernamePasswordLogin(id, username, password);
      break;
    }

    case "login2fa": {
      const { id, code } = params;
      response = await queue2FACodeRedeem(id, code);
      break;
    }

    case "loginCookies": {
      const { id, cookies } = params;
      response = await queueCookiesLogin(id, cookies);
      break;
    }

    case "nullOperation": {
      const { timeout } = params;
      response = await queueNullOperation(timeout);
      break;
    }

    case "getAuthQueueItemStatus": {
      const { c } = params;
      response = await getAuthQueueItemStatus(c);
      break;
    }
  }

  await sendMQResponse(mqid, response);
}

async function mqGetShop(id, account = null) {
  await mqSendMessage("getShop", { id, account });
}
async function mqLoginUsernamePass(id, username, password) {
  await mqSendMessage("loginUsernamePass", { id, username, password });
}
async function mqLogin2fa(id, code) {
  await mqSendMessage("login2fa", { id, code });
}
async function mqLoginCookies(id, cookies) {
  await mqSendMessage("loginCookies", { id, cookies });
}
async function mqNullOperation(timeout) {
  await mqSendMessage("nullOperation", { timeout });
}
async function mqGetAuthQueueItemStatus(c) {
  await mqSendMessage("getAuthQueueItemStatus", { c });
}

const rateLimits = {};

const rateLimitBackoff = 60;
const rateLimitCap = 600;

function checkRateLimit(req, url) {
  let rateLimited =
    req.statusCode === 429 ||
    req.headers.location?.startsWith("/auth-error?error=rate_limited");
  if (!rateLimited)
    try {
      const json = JSON.parse(req.body);
      rateLimited = json.error === "rate_limited";
    } catch (e) {}

  if (rateLimited) {
    let retryAfter = parseInt(req.headers["retry-after"]) + 1;
    if (retryAfter) {
      console.log(
        `I am ratelimited at ${url} for ${retryAfter - 1} more seconds!`
      );
      if (retryAfter > rateLimitCap) {
        console.log(
          `Delay higher than rateLimitCap, setting it to ${rateLimitCap} seconds instead`
        );
        retryAfter = rateLimitCap;
      }
    } else {
      retryAfter = rateLimitBackoff;
      console.log(
        `I am temporarily ratelimited at ${url} (no ETA given, waiting ${rateLimitBackoff}s)`
      );
    }

    const retryAt = Date.now() + retryAfter * 1000;
    rateLimits[url] = retryAt;
    return retryAt;
  }

  return false;
}

function isRateLimited(url) {
  const retryAt = rateLimits[url];
  if (!retryAt) return false;

  if (retryAt < Date.now()) {
    delete rateLimits[url];
    return false;
  }

  const retryAfter = (retryAt - Date.now()) / 1000;
  console.log(
    `I am still ratelimited at ${url} for ${retryAfter} more seconds!`
  );

  return retryAt;
}

const settings = {
  dailyShop: {
    // stores false or channel id
    set: (value, interaction) =>
      value === "true" ? interaction.channelId : false,
    render: (value, interaction) => {
      const isChannelId = (v) => !isNaN(parseFloat(v));
      if (isChannelId(value))
        return s(interaction).info.ALERT_IN_CHANNEL.f({ c: value });
      return value;
    },
    choices: (interaction) => {
      // [interaction.channel?.name || s(interaction).info.ALERT_IN_DM_CHANNEL, false]
      // if the channel name is not in cache, assume it's a DM channel
      let channelOption = interaction.channel?.name
        ? s(interaction).info.ALERT_IN_CHANNEL_NAME.f({
            c: interaction.channel.name,
          })
        : s(interaction).info.ALERT_IN_DM_CHANNEL;
      return [channelOption, false];
    },
    values: [true, false],
    default: false,
  },
  pingOnAutoDailyShop: {
    values: [true, false],
    default: true,
  },
  hideIgn: {
    values: [true, false],
    default: false,
  },
  othersCanViewShop: {
    values: [true, false],
    default: true,
  },
  othersCanViewColl: {
    values: [true, false],
    default: true,
  },
  othersCanViewProfile: {
    values: [true, false],
    default: true,
  },
  othersCanUseAccountButtons: {
    values: [true, false],
    default: true,
  },
  locale: {
    values: ["Automatic"], // locales will be added after imports finished processing
    default: "Automatic",
  },
  localeForced: {
    hidden: true,
  },
};

// setTimeout(() =>
//   settings.locale.values.push(...Object.keys(discLanguageNames))
// );

const defaultSettings = {};
for (const setting in settings) {
  defaultSettings[setting] = settings[setting].default;
}

function getSettings(id) {
  const json = readUserJson(id);
  if (!json) return defaultSettings;

  if (!json.settings) {
    json.settings = defaultSettings;
    saveUserJson(id, json);
  } else {
    let changed = false;

    for (const setting in defaultSettings) {
      if (!(setting in json.settings)) {
        json.settings[setting] = defaultSettings[setting];
        changed = true;
      }
    }

    for (const setting in json.settings) {
      if (!(setting in defaultSettings)) {
        delete json.settings[setting];
        changed = true;
      }
    }

    if (changed) saveUserJson(id, json);
  }

  return json.settings;
}

function getSetting(id, setting) {
  return getSettings(id)[setting];
}

function setSetting(interaction, setting, value, force = false) {
  // force = whether is set from /settings set
  const id = interaction.user.id;
  const json = readUserJson(id);
  if (!json) return defaultSettings[setting]; // returns the default setting if the user does not have an account (this method may be a little bit funny, but it's better than an error)

  if (setting === "locale") {
    if (force) {
      json.settings.localeForced = value !== "Automatic";
      json.settings.locale = json.settings.localeForced
        ? computerifyValue(value)
        : "Automatic";
    } else if (!json.settings.localeForced) {
      json.settings.locale = value;
    }
  } else {
    let setValue = settings[setting].set
      ? settings[setting].set(value, interaction)
      : value;
    json.settings[setting] = computerifyValue(setValue);
  }

  saveUserJson(id, json);

  return json.settings[setting];
}

function registerInteractionLocale(interaction) {
  const settings = getSettings(interaction.user.id);
  if (!settings.localeForced && settings.locale !== interaction.locale)
    setSetting(interaction, "locale", interaction.locale);
}

async function handleSettingsViewCommand(interaction) {
  const settings = getSettings(interaction.user.id);

  await interaction.reply(settingsEmbed(settings, interaction));
}

async function handleSettingsSetCommand(interaction) {
  const setting = interaction.options.getString("setting");

  const settingValues = settings[setting].values;
  const choices = settings[setting].choices?.(interaction) || [];

  const row = new ActionRowBuilder();

  const options = settingValues.slice(0, 25).map((value) => {
    return {
      label: humanifyValue(choices.shift() || value, setting, interaction),
      value: `${setting}/${value}`,
    };
  });

  row.addComponents(
    new StringSelectMenuBuilder().setCustomId("set-setting").addOptions(options)
  );

  await interaction.reply({
    embeds: [
      secondaryEmbed(
        s(interaction).settings.SET_QUESTION.f({
          s: settingName(setting, interaction),
        })
      ),
    ],
    components: [row],
  });
}

async function handleSettingDropdown(interaction) {
  const [setting, value] = interaction.values[0].split("/");

  const valueSet = setSetting(interaction, setting, value, true);

  await interaction.update({
    embeds: [
      basicEmbed(
        s(interaction).settings.CONFIRMATION.f({
          s: settingName(setting, interaction),
          v: humanifyValue(valueSet, setting, interaction),
        })
      ),
    ],
    components: [],
  });
}

function settingName(setting, interaction) {
  return s(interaction).settings[setting];
}

function settingIsVisible(setting) {
  return !settings[setting].hidden;
}

function humanifyValue(value, setting, interaction, emoji = false) {
  if (settings[setting].render)
    value = settings[setting].render(value, interaction);
  if (value === true) return emoji ? "✅" : s(interaction).settings.TRUE;
  if (value === false) return emoji ? "❌" : s(interaction).settings.FALSE;
  if (value === "Automatic")
    return (emoji ? "🌐 " : "") + s(interaction).settings.AUTO;
  if (Object.keys(discLanguageNames).includes(value))
    return discLanguageNames[value];
  return value.toString();
}

function computerifyValue(value) {
  if (["true", "false"].includes(value)) return value === "true";
  if (!isNaN(parseInt(value)) && value.length < 15) return parseInt(value); // do not parse discord IDs
  if (Object.values(discLanguageNames).includes(value))
    return findKeyOfValue(discLanguageNames, value);
  return value;
}

// Simplification des fonctionnalités pour ne conserver que l'essentiel
const getShop = async (id, account = null) => {
  const authSuccess = await authUser(id, account);
  if (!authSuccess.success) return authSuccess;

  const user = getUser(id, account);
  console.log(`Fetching shop for ${user.username}...`);

  const req = await fetch(
    `https://pd.${userRegion(user)}.a.pvp.net/store/v2/storefront/${
      user.puuid
    }`,
    {
      headers: {
        Authorization: "Bearer " + user.auth.rso,
        "X-Riot-Entitlements-JWT": user.auth.ent,
      },
    }
  );

  if (req.statusCode !== 200) {
    console.error(
      `Valorant shop request failed with status code: ${req.statusCode}`
    );
    return { success: false };
  }

  const json = JSON.parse(req.body);
  if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
    deleteUserAuth(user);
    return { success: false };
  } else if (json.Maintenance) return { success: false, maintenance: true };

  return { success: true, shop: json };
};

const addShopCache = (puuid, shopJson) => {
  const now = Date.now();
  const shopCacheFilePath = `data/shopCache/${puuid}.json`;
  const shopCache = {
    offers: shopJson.SkinsPanelLayout.SingleItemOffers.map((offer) => ({
      offerId: offer,
      expires:
        now +
        shopJson.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds,
    })),
    timestamp: now,
  };

  fs.writeFileSync(shopCacheFilePath, JSON.stringify(shopCache, null, 2));
  console.log(`Shop cache added for user ${discordTag(puuid)}.`);
};

const getShopCache = (puuid) => {
  const shopCacheFilePath = `data/shopCache/${puuid}.json`;
  if (!fs.existsSync(shopCacheFilePath)) return null;

  try {
    const shopCache = JSON.parse(fs.readFileSync(shopCacheFilePath, "utf8"));
    return shopCache;
  } catch (e) {
    console.error("Error reading shop cache:", e);
    return null;
  }
};

const getBundles = async (id, account = null) => {
  const shopCache = getShopCache(getPuuid(id, account), "bundles");
  if (shopCache) return { success: true, bundles: shopCache.bundles };

  const resp = await getShop(id, account);
  if (!resp.success) return resp;

  const formatted = await Promise.all(
    resp.shop.FeaturedBundle.Bundles.map((rawBundle) => formatBundle(rawBundle))
  );

  return { success: true, bundles: formatted };
};

const getNightMarket = async (id, account = null) => {
  const shopCache = getShopCache(getPuuid(id, account), "night_market");
  if (shopCache) return { success: true, ...shopCache.night_market };

  const resp = await getShop(id, account);
  if (!resp.success) return resp;

  if (!resp.shop.BonusStore)
    return {
      success: true,
      offers: false,
    };

  return { success: true, ...formatNightMarket(resp.shop.BonusStore) };
};

const getBalance = async (id, account = null) => {
  const authSuccess = await authUser(id, account);
  if (!authSuccess.success) return authSuccess;

  const user = getUser(id, account);
  console.log(`Fetching balance for ${user.username}...`);

  // https://github.com/techchrism/valorant-api-docs/blob/trunk/docs/Store/GET%20Store_GetWallet.md
  const req = await fetch(
    `https://pd.${userRegion(user)}.a.pvp.net/store/v1/wallet/${user.puuid}`,
    {
      headers: {
        Authorization: "Bearer " + user.auth.rso,
        "X-Riot-Entitlements-JWT": user.auth.ent,
      },
    }
  );
  console.assert(
    req.statusCode === 200,
    `Valorant balance code is ${req.statusCode}!`,
    req
  );

  const json = JSON.parse(req.body);
  if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
    deleteUser(id, account);
    return { success: false };
  } else if (isMaintenance(json)) return { success: false, maintenance: true };

  return {
    success: true,
    vp: json.Balances["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"],
    rad: json.Balances["e59aa87c-4cbf-517a-5983-6e81511be9b7"],
    kc: json.Balances["85ca954a-41f2-ce94-9b45-8ca3dd39a00d"],
  };
};

const getOffers = async (id, account = null) => {
  const shopCache = getShopCache(getPuuid(id, account), "offers");
  if (shopCache) return { success: true, cached: true, ...shopCache.offers };

  const resp = await getShop(id, account);
  if (!resp.success) return resp;

  return await easterEggOffers(id, account, {
    success: true,
    offers: resp.shop.SkinsPanelLayout.SingleItemOffers,
    expires:
      Math.floor(Date.now() / 1000) +
      resp.shop.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds,
    accessory: {
      offers: (resp.shop.AccessoryStore.AccessoryStoreOffers || []).map(
        (rawAccessory) => {
          return {
            cost: rawAccessory.Offer.Cost[
              "85ca954a-41f2-ce94-9b45-8ca3dd39a00d"
            ],
            rewards: rawAccessory.Offer.Rewards,
            contractID: rawAccessory.ContractID,
          };
        }
      ),
      expires:
        Math.floor(Date.now() / 1000) +
        resp.shop.AccessoryStore.AccessoryStoreRemainingDurationInSeconds,
    },
  });
};

// Supposons que ces constantes représentent les valeurs retournées par vos promesses d'emojis
const emoji = "<:vp:1227277766068666469>"; // Exemple d'emoji VP
const kcEmoji = "<:kc:1227277767188545599>"; // Exemple d'emoji KC

async function fetchShop(
  interaction,
  user,
  targetId = interaction.user.id,
  accessory = null
) {
  let shop = await getOffers(targetId);
  if (shop.inQueue) shop = await waitForShopQueueResponse(shop);

  user = getUser(user);
  if (accessory === "daily" || !accessory) {
    return await renderOffers(shop, interaction, user, emoji, targetId);
  } else {
    return await renderAccessoryOffers(
      shop,
      interaction,
      user,
      kcEmoji,
      targetId
    );
  }
}

function isThereANM() {
  if (!NMTimestamp) return false;
  if (isToday(NMTimestamp)) return true;
  else {
    return false;
  }
}

async function fetchBundles(interaction) {
  let bundles = await getBundles(interaction.user.id);
  if (bundles.inQueue) bundles = await waitForShopQueueResponse(bundles);

  return await renderBundles(bundles, interaction, emoji);
}

async function fetchNightMarket(interaction, user) {
  const channel =
    interaction.channel || (await fetchChannel(interaction.channelId));

  let market = await getNightMarket(interaction.user.id);
  if (market.inQueue) market = await waitForShopQueueResponse(market);

  return await renderNightMarket(market, interaction, user, emoji);
}

let stats = {
  fileVersion: 2,
  stats: {},
};
let overallStats = {
  shopsIncluded: 0,
  items: {},
};

const trackStoreStats = false;
const statsExpirationDays = 14;

function loadStats(filename = "data/stats.json") {
  if (!trackStoreStats) return;
  try {
    const obj = JSON.parse(fs.readFileSync(filename).toString());

    if (!obj.fileVersion) transferStatsFromV1(obj);
    else stats = obj;

    saveStats(filename);

    calculateOverallStats();
  } catch (e) {}
}

function saveStats(filename = "data/stats.json") {
  fs.writeFileSync(filename, JSON.stringify(stats, null, 2));
}

function calculateOverallStats() {
  cleanupStats();

  overallStats = {
    shopsIncluded: 0,
    items: {},
  };
  let items = {};

  for (let dateString in stats.stats) {
    if (statsExpirationDays && daysAgo(dateString) > statsExpirationDays) {
      // delete stats.stats[dateString];
      continue;
    }
    const dayStats = stats.stats[dateString];

    overallStats.shopsIncluded += dayStats.shopsIncluded;
    for (let item in dayStats.items) {
      if (item in items) {
        items[item] += dayStats.items[item];
      } else {
        items[item] = dayStats.items[item];
      }
    }
  }

  const sortedItems = Object.entries(items).sort(([, a], [, b]) => b - a);
  for (const [uuid, count] of sortedItems) {
    overallStats.items[uuid] = count;
  }
}

function getOverallStats() {
  loadStats();
  return overallStats || {};
}

function getStatsFor(uuid) {
  loadStats();
  return {
    shopsIncluded: overallStats.shopsIncluded,
    count: overallStats.items[uuid] || 0,
    rank: [
      Object.keys(overallStats.items).indexOf(uuid) + 1,
      Object.keys(overallStats.items).length,
    ],
  };
}

function addStore(puuid, items) {
  if (!trackStoreStats) return;

  loadStats();

  const today = formatDate(new Date());

  let todayStats = stats.stats[today];
  if (!todayStats) {
    todayStats = {
      shopsIncluded: 0,
      items: {},
      users: [],
    };
    stats.stats[today] = todayStats;
  }

  if (todayStats.users.includes(puuid)) return;
  todayStats.users.push(puuid);

  for (const item of items) {
    if (item in todayStats.items) {
      todayStats.items[item]++;
    } else {
      todayStats.items[item] = 1;
    }
  }
  todayStats.shopsIncluded++;

  saveStats();

  calculateOverallStats();
}

function cleanupStats() {
  if (!statsExpirationDays) return;

  for (const dateString in stats.stats) {
    if (daysAgo(dateString) > statsExpirationDays) {
      delete stats.stats[dateString];
    }
  }

  saveStats();
}

function formatDate(date) {
  return `${date.getUTCDate()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCFullYear()}`;
}

function daysAgo(dateString) {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const [day, month, year] = dateString.split("-");
  const date = new Date(Date.UTC(year, month - 1, day));

  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function transferStatsFromV1(obj) {
  stats.stats[formatDate(new Date())] = {
    shopsIncluded: obj.shopsIncluded,
    items: obj.itemStats,
    users: obj.usersAddedToday,
  };
}

const tlsCiphers = [
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_128_GCM_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES128-SHA256",
  "ECDHE-RSA-AES128-SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-AES128-SHA",
  "ECDHE-RSA-AES128-SHA",
  "ECDHE-ECDSA-AES256-SHA",
  "ECDHE-RSA-AES256-SHA",
  "RSA-PSK-AES128-GCM-SHA256",
  "RSA-PSK-AES256-GCM-SHA384",
  "RSA-PSK-AES128-CBC-SHA",
  "RSA-PSK-AES256-CBC-SHA",
];

const tlsSigAlgs = [
  "ecdsa_secp256r1_sha256",
  "rsa_pss_rsae_sha256",
  "rsa_pkcs1_sha256",
  "ecdsa_secp384r1_sha384",
  "rsa_pss_rsae_sha384",
  "rsa_pkcs1_sha384",
  "rsa_pss_rsae_sha512",
  "rsa_pkcs1_sha512",
  "rsa_pkcs1_sha1",
];

function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        ...options,
        headers: {
          ...options.headers,
          cookie: "dummy=cookie",
          "Accept-Language": "en-US,en;q=0.5",
          referer: "https://github.com/giorgi-o/SkinPeek",
        },
        ciphers: tlsCiphers.join(":"),
        sigalgs: tlsSigAlgs.join(":"),
        minVersion: "TLSv1.3",
      },
      (resp) => {
        let data = [];
        resp.on("data", (chunk) => data.push(chunk));
        resp.on("end", () => {
          const body = Buffer.concat(data).toString("utf8");
          resolve({ statusCode: resp.statusCode, headers: resp.headers, body });
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const ProxyType = {
  HTTPS: "https",
  // SOCKS4: "socks4", // not supported yet
  // SOCKS5: "socks5", // not supported yet
};

class Proxy {
  constructor({ manager, type, host, port, username, password }) {
    this.manager = manager;
    this.type = type || ProxyType.HTTPS;
    this.host = host;
    this.port = port;
    this.username = username;
    this.password = password;

    this.publicIp = null;
  }

  createAgent(hostname) {
    if (this.type !== ProxyType.HTTPS)
      throw new Error("Unsupported proxy type " + this.type);

    return new Promise((resolve, reject) => {
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
        Host: hostname,
      };
      if (this.username && this.password) {
        headers["Proxy-Authorization"] =
          "Basic " +
          Buffer.from(this.username + ":" + this.password).toString("base64");
      }

      const req = http.request({
        host: this.host,
        port: this.port,
        method: "CONNECT",
        path: hostname + ":443",
        headers: headers,
        timeout: 10,
      });
      console.log(
        `Sent proxy connection request to ${this.host}:${this.port} for ${hostname}`
      );

      req.on("connect", (res, socket) => {
        console.log(
          `Proxy ${this.host}:${this.port} connected to ${hostname}!`
        );
        if (res.statusCode !== 200) {
          reject(
            `Proxy ${this.host}:${this.port} returned status code ${res.statusCode}!`
          );
        }

        socket.on("error", (err) => {
          console.error(
            `Proxy ${this.host}:${this.port} socket errored: ${err}`
          );
          this.manager.proxyIsDead(this, hostname);
        });

        const agent = new https.Agent({ socket });
        resolve(agent);
      });

      req.on("error", (err) => {
        reject(`Proxy ${this.host}:${this.port} errored: ${err}`);
      });

      req.end();
    });
  }

  async test() {
    const res = await fetch("https://api.ipify.org", {
      proxy: await this.createAgent("api.ipify.org"),
    });

    if (res.statusCode !== 200) {
      console.error(
        `Proxy ${this.host}:${this.port} returned status code ${res.statusCode}!`
      );
      return false;
    }

    const ip = res.body.trim();
    if (!ip) {
      console.error(`Proxy ${this.host}:${this.port} returned no IP!`);
      return false;
    }

    this.publicIp = ip;
    return true;
  }
}

class ProxyManager {
  constructor() {
    this.allProxies = [];

    this.activeProxies = {
      "example.com": [],
    };
    this.deadProxies = [];

    this.enabled = false;
  }

  async loadProxies() {
    const proxyFile = await asyncReadFile("data/proxies.txt").catch((_) => {});
    if (!proxyFile) return;

    let type = ProxyType.HTTPS;
    let username = null;
    let password = null;

    // for each line in proxies.txt
    for (const line of proxyFile.toString().split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.length || trimmed.startsWith("#")) continue;

      // split by colons
      const parts = trimmed.split(":");
      if (parts.length < 2) continue;

      // first part is the proxy host
      const host = parts[0];
      if (!host.length) continue;

      // second part is the proxy port
      const port = parseInt(parts[1]);
      if (isNaN(port)) continue;

      // third part is the proxy type
      type = parts[2]?.toLowerCase() || ProxyType.HTTPS;
      if (type !== ProxyType.HTTPS) {
        console.error(`Unsupported proxy type ${type}!`);
        type = ProxyType.HTTPS;
        continue;
      }

      // fourth part is the proxy username
      username = parts[3] || null;

      // fifth part is the proxy password
      password = parts[4] || null;

      // create the proxy object
      const proxy = new Proxy({
        type,
        host,
        port,
        username,
        password,
        manager: this,
      });

      // add it to the list of all proxies
      this.allProxies.push(proxy);
    }

    this.enabled = this.allProxies.length > 0;
  }

  async loadForHostname(hostname) {
    if (!this.enabled) return;

    // called both to load the initial set of proxies for a hostname,
    // and to repopulate the list if the current set has an invalid one

    const activeProxies = this.activeProxies[hostname] || [];
    const promises = [];

    async function proxyFailed(proxy) {
      this.deadProxies.push(proxy);
    }

    for (const proxy of this.allProxies) {
      if (!this.allProxies.length) break;
      if (activeProxies.includes(proxy)) continue;
      if (this.deadProxies.includes(proxy)) continue;

      /*try {
                const proxyWorks = await proxy.test();
                if(!proxyWorks) {
                    this.deadProxies.push(proxy);
                    continue;
                }

                await proxy.createAgent(hostname);
                activeProxies.push(proxy);
            } catch(err) {
                console.error(err);
                this.deadProxies.push(proxy);
            }*/

      let timedOut = false;
      const promise = proxy
        .test()
        .then((proxyWorks) => {
          if (!proxyWorks)
            return Promise.reject(`Proxy ${proxy.host}:${proxy.port} failed!`);
          if (timedOut) return Promise.reject();

          return proxy.createAgent(hostname);
        })
        .then((/*agent*/) => {
          if (timedOut) return;

          activeProxies.push(proxy);
        })
        .catch((err) => {
          if (err) console.error(err);
          proxyFailed(proxy);
        });

      const promiseWithTimeout = promiseTimeout(promise, 5000).then((res) => {
        if (res === null) {
          timedOut = true;
          console.error(`Proxy ${proxy.host}:${proxy.port} timed out!`);
        }
      });
      promises.push(promiseWithTimeout);
    }

    await Promise.all(promises);

    if (!activeProxies.length) {
      console.error(`No working proxies found!`);
      return;
    }

    console.log(`Loaded ${activeProxies.length} proxies for ${hostname}`);
    this.activeProxies[hostname] = activeProxies;

    return activeProxies;
  }

  async getProxy(hostname) {
    if (!this.enabled) return null;

    const activeProxies = await this.loadForHostname(hostname);
    if (!activeProxies?.length) return null;

    let proxy;
    do {
      proxy = activeProxies.shift();
    } while (this.deadProxies.includes(proxy));
    if (!proxy) return null;

    activeProxies.push(proxy);
    return proxy;
  }

  async getProxyForUrl(url) {
    const hostname = new URL(url).hostname;
    return this.getProxy(hostname);
  }

  async proxyIsDead(proxy, hostname) {
    this.deadProxies.push(proxy);
    await this.loadForHostname(hostname);
  }

  async fetch(url, options = {}) {
    // if(!this.enabled) return await fetch(url, options);
    if (!this.enabled) return;

    const hostname = new URL(url).hostname;
    const proxy = await this.getProxy(hostname);
    if (!proxy) return await fetch(url, options);

    const agent = await proxy.createAgent(hostname);
    const req = await fetch(url, {
      ...options,
      proxy: agent.createConnection,
    });

    // test for 1020 or rate limit
    const hostnameAndProxy = `${new URL(url).hostname} proxy=${proxy.host}:${
      proxy.port
    }`;
    if (
      (req.statusCode === 403 && req.body === "error code: 1020") ||
      checkRateLimit(req, hostnameAndProxy)
    ) {
      console.error(`Proxy ${proxy.host}:${proxy.port} is dead!`);
      console.error(req);
      await this.proxyIsDead(proxy, hostname);
      return await this.fetch(url, options);
    }
  }
}

function asyncReadFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function asyncReadJSONFile(path) {
  return JSON.parse(await asyncReadFile(path).toString());
}

// riot utils

const WeaponType = {
  Classic: "Classic",
  Shorty: "Shorty",
  Frenzy: "Frenzy",
  Ghost: "Ghost",
  Sheriff: "Sheriff",

  Stinger: "Stinger",
  Spectre: "Spectre",
  Bucky: "Bucky",
  Judge: "Judge",

  Bulldog: "Bulldog",
  Guardian: "Guardian",
  Phantom: "Phantom",
  Vandal: "Vandal",

  Marshal: "Marshal",
  Outlaw: "Outlaw",
  Operator: "Operator",
  Ares: "Ares",
  Odin: "Odin",
  Knife: "Knife",
};

const WeaponTypeUuid = {
  [WeaponType.Odin]: "63e6c2b6-4a8e-869c-3d4c-e38355226584",
  [WeaponType.Ares]: "55d8a0f4-4274-ca67-fe2c-06ab45efdf58",
  [WeaponType.Vandal]: "9c82e19d-4575-0200-1a81-3eacf00cf872",
  [WeaponType.Bulldog]: "ae3de142-4d85-2547-dd26-4e90bed35cf7",
  [WeaponType.Phantom]: "ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a",
  [WeaponType.Judge]: "ec845bf4-4f79-ddda-a3da-0db3774b2794",
  [WeaponType.Bucky]: "910be174-449b-c412-ab22-d0873436b21b",
  [WeaponType.Frenzy]: "44d4e95c-4157-0037-81b2-17841bf2e8e3",
  [WeaponType.Classic]: "29a0cfab-485b-f5d5-779a-b59f85e204a8",
  [WeaponType.Ghost]: "1baa85b4-4c70-1284-64bb-6481dfc3bb4e",
  [WeaponType.Sheriff]: "e336c6b8-418d-9340-d77f-7a9e4cfe0702",
  [WeaponType.Shorty]: "42da8ccc-40d5-affc-beec-15aa47b42eda",
  [WeaponType.Operator]: "a03b24d3-4319-996d-0f8c-94bbfba1dfc7",
  [WeaponType.Guardian]: "4ade7faa-4cf1-8376-95ef-39884480959b",
  [WeaponType.Marshal]: "c4883e50-4494-202c-3ec3-6b8a9284f00b",
  [WeaponType.Outlaw]: "5f0aaf7a-4289-3998-d5ff-eb9a5cf7ef5c",
  [WeaponType.Spectre]: "462080d1-4035-2937-7c09-27aa2a5c27a7",
  [WeaponType.Stinger]: "f7e1b454-4ad4-1063-ec0a-159e56b58941",
  [WeaponType.Knife]: "2f59173c-4bed-b6c3-2191-dea9b58be9c7",
};

const itemTypes = {
  SKIN: "e7c63390-eda7-46e0-bb7a-a6abdacd2433",
  BUDDY: "dd3bf334-87f3-40bd-b043-682a57a8dc3a",
  SPRAY: "d5f120f8-ff8c-4aac-92ea-f2b5acbe9475",
  CARD: "3f296c07-64c3-494c-923b-fe692a4fa1bd",
  TITLE: "de7caa6b-adf7-4588-bbd1-143831e786c6",
};

function parseSetCookie(setCookie) {
  if (!setCookie) {
    console.error(
      "Riot didn't return any cookies during the auth request! Cloudflare might have something to do with it..."
    );
    return {};
  }

  const cookies = {};
  for (const cookie of setCookie) {
    const sep = cookie.indexOf("=");
    cookies[cookie.slice(0, sep)] = cookie.slice(sep + 1, cookie.indexOf(";"));
  }
  return cookies;
}

function stringifyCookies(cookies) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function extractTokensFromUri(uri) {
  const match = uri.match(
    /access_token=((?:[a-zA-Z]|\d|\.|-|_)*).*id_token=((?:[a-zA-Z]|\d|\.|-|_)*).*expires_in=(\d*)/
  );
  if (!match) return [null, null];
  return [match[1], match[2]];
}

function decodeToken(token) {
  const encodedPayload = token.split(".")[1];
  const buff = Buffer.from(encodedPayload, "base64");
  return JSON.parse(buff.toString("ascii"));
}

function tokenExpiry(token) {
  const decoded = decodeToken(token);
  return decoded.exp * 1000;
}

function userRegion({ region }) {
  return !region || region === "latam" || region === "br" ? "na" : region;
}

function isMaintenance(json) {
  return json.httpStatus === 403 && json.errorCode === "SCHEDULED_DOWNTIME";
}

async function formatBundle(rawBundle) {
  const bundle = {
    uuid: rawBundle.DataAssetID,
    expires:
      Math.floor(Date.now() / 1000) + rawBundle.DurationRemainingInSeconds,
    items: [],
  };

  let price = 0;
  let basePrice = 0;
  for (const rawItem of rawBundle.Items) {
    const item = {
      uuid: rawItem.Item.ItemID,
      type: rawItem.Item.ItemTypeID,
      item: await getItem(rawItem.Item.ItemID, rawItem.Item.ItemTypeID),
      amount: rawItem.Item.Amount,
      price: rawItem.DiscountedPrice,
      basePrice: rawItem.BasePrice,
      discount: rawItem.DiscountPercent,
    };

    price += item.price;
    basePrice += item.basePrice;

    bundle.items.push(item);
  }

  bundle.price = price;
  bundle.basePrice = basePrice;

  return bundle;
}

async function fetchMaintenances(region) {
  const req = await fetch(
    `https://valorant.secure.dyn.riotcdn.net/channels/public/x/status/${region}.json`
  );
  return JSON.parse(req.body);
}

function formatNightMarket(rawNightMarket) {
  if (!rawNightMarket) return null;

  return {
    offers: rawNightMarket.BonusStoreOffers.map((offer) => {
      return {
        uuid: offer.Offer.OfferID,
        realPrice: offer.Offer.Cost["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"],
        nmPrice: offer.DiscountCosts["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"],
        percent: offer.DiscountPercent,
      };
    }),
    expires:
      Math.floor(Date.now() / 1000) +
      rawNightMarket.BonusStoreRemainingDurationInSeconds,
  };
}

function removeDupeAlerts(alerts) {
  const uuids = [];
  return alerts.filter((alert) => {
    if (uuids.includes(alert.uuid)) return false;
    return uuids.push(alert.uuid);
  });
}

function getPuuid(id, account = null) {
  return getUser(id, account).puuid;
}

function isDefaultSkin(skin) {
  return skin.skinUuid === skin.defaultSkinUuid;
}

// discord utils

async function defer(interaction, ephemeral = false) {
  // discord only sets deferred to true once the event is sent over ws, which doesn't happen immediately
  await interaction.deferReply({ ephemeral });
  interaction.deferred = true;
}

async function skinNameAndEmoji(
  skin,
  channel,
  localeOrInteraction = DEFAULT_LANG
) {
  const name = l(skin.names, localeOrInteraction);
  if (!skin.rarity) return name;

  const rarity = await getRarity(skin.rarity, channel);
  if (!rarity) return name;

  const rarityIcon = ""; //await rarityEmoji(channel, rarity.name, rarity.icon);
  return rarityIcon ? `${rarityIcon} ${name}` : name;
}

function actionRow(button) {
  return new ActionRowBuilder().addComponents(button);
}

function removeAlertButton(id, uuid, buttonText) {
  return new ButtonBuilder()
    .setCustomId(
      `removealert/${uuid}/${id}/${Math.round(Math.random() * 100000)}`
    )
    .setStyle(ButtonStyle.Danger)
    .setLabel(buttonText)
    .setEmoji("✖");
}
function removeAlertActionRow(id, uuid, buttonText) {
  return new ActionRowBuilder().addComponents(
    removeAlertButton(id, uuid, buttonText)
  );
}

function retryAuthButton(id, operationId, buttonText) {
  return new ButtonBuilder()
    .setCustomId(`retry_auth/${operationId}`)
    .setStyle(ButtonStyle.Danger)
    .setLabel(buttonText)
    .setEmoji("🔄");
}

function externalEmojisAllowed(channel) {
  !channel ||
    !channel.guild ||
    channel
      .permissionsFor(channel.guild.roles.everyone)
      .has(PermissionsBitField.Flags.UseExternalEmojis);
}
function canCreateEmojis(guild) {
  return (
    guild &&
    guild.members.me &&
    guild.members.me.permissions.has(
      PermissionsBitField.Flags.ManageEmojisAndStickers
    )
  );
}
function emojiToString(emoji) {
  return emoji && `<:${emoji.name}:${emoji.id}>`;
}

function canSendMessages(channel) {
  if (!channel || !channel.guild) return true;
  const permissions = channel.permissionsFor(channel.guild.members.me);
  return (
    permissions.has(PermissionsBitField.Flags.ViewChannel) &&
    permissions.has(PermissionsBitField.Flags.SendMessages) &&
    permissions.has(PermissionsBitField.Flags.EmbedLinks)
  );
}

async function fetchChannel(channelId) {
  try {
    return await client.channels.fetch(channelId);
  } catch (e) {
    return null;
  }
}

async function getChannelGuildId(channelId) {
  const channel = client.channels.cache.get(channelId);
  return channel ? channel.guildId : null;
}

function valNamesToDiscordNames(names) {
  const obj = {};
  for (const [valLang, name] of Object.entries(names)) {
    if (valToDiscLang[valLang]) obj[valToDiscLang[valLang]] = name;
  }
  return obj;
}

function canEditInteraction(interaction) {
  return Date.now() - interaction.createdTimestamp < 14.8 * 60 * 1000;
}

function discordTag(id) {
  const user = client.users.cache.get(id);
  return user ? `${user.username}#${user.discriminator}` : id;
}

// misc utils

function wait(ms) {
  new Promise((r) => setTimeout(r, ms));
}

async function promiseTimeout(promise, ms, valueIfTimeout = null) {
  return await Promise.race([promise, wait(ms).then(() => valueIfTimeout)]);
}

function isToday(timestamp) {
  return isSameDay(timestamp, Date.now());
}
function isSameDay(t1, t2) {
  t1 = new Date(t1);
  t2 = new Date(t2);
  return (
    t1.getUTCFullYear() === t2.getUTCFullYear() &&
    t1.getUTCMonth() === t2.getUTCMonth() &&
    t1.getUTCDate() === t2.getUTCDate()
  );
}

function ensureUsersFolder() {
  if (!fs.existsSync("data")) fs.mkdirSync("data");
  if (!fs.existsSync("data/users")) fs.mkdirSync("data/users");
}

function findKeyOfValue(obj, value) {
  return Object.keys(obj).find((key) => obj[key] === value);
}

function calcLength(any) {
  if (!isNaN(any)) any = any.toString();
  return any.length;
}

function ordinalSuffix(number) {
  return number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : ["th", "st", "nd", "rd"][number % 10 < 4 ? number % 10 : 0];
}

module.exports = {
  fetch,
  Proxy,
  ProxyManager,
  asyncReadFile,
  asyncReadJSONFile,
  WeaponType,
  WeaponTypeUuid,
  itemTypes,
  parseSetCookie,
  stringifyCookies,
  extractTokensFromUri,
  decodeToken,
  tokenExpiry,
  userRegion,
  isMaintenance,
  getPuuid,
  isDefaultSkin,
  removeDupeAlerts,
  formatNightMarket,
  fetchMaintenances,
  defer,
  skinNameAndEmoji,
  actionRow,
  removeAlertButton,
  externalEmojisAllowed,
  canCreateEmojis,
  emojiToString,
  retryAuthButton,
  removeAlertButton,
  externalEmojisAllowed,
  removeAlertActionRow,
  canSendMessages,
  fetchChannel,
  getChannelGuildId,
  valNamesToDiscordNames,
  canEditInteraction,
  discordTag,
  wait,
  promiseTimeout,
  isToday,
  isSameDay,
  ensureUsersFolder,
  findKeyOfValue,
  calcLength,
  ordinalSuffix,
  readUserJson,
  getUserJson,
  saveUserJson,
  saveUser,
  addUser,
  deleteUser,
  deleteWholeUser,
  getNumberOfAccounts,
  switchAccount,
  getAccountWithPuuid,
  findTargetAccountIndex,
  removeDupeAccounts,
  User,
  getUser,
  transferUserDataFromOldUsersJson,
  getUserList,
  authUser,
  redeemUsernamePassword,
  redeem2FACode,
  processAuthResponse,
  getUserInfo,
  getEntitlements,
  getRegion,
  redeemCookies,
  refreshToken,
  fetchRiotClientVersion,
  getUserAgent,
  detectCloudflareBlock,
  deleteUserAuth,
  waitForAuthQueueResponse,
  activeWaitForAuthQueueResponse,
  loginUsernamePassword,
  login2FA,
  retryFailedOperation,
  cleanupFailedOperations,
  startAuthQueue,
  queueUsernamePasswordLogin,
  queue2FACodeRedeem,
  queueCookiesLogin,
  queueNullOperation,
  processAuthQueue,
  getAuthQueueItemStatus,
  Operations,
  clearCache,
  getValorantVersion,
  loadSkinsJSON,
  saveSkinsJSON,
  fetchData,
  getSkinList,
  getPrices,
  getBundleList,
  addBundleData,
  getRarities,
  getBuddies,
  getCards,
  getSprays,
  getTitles,
  fetchBattlepassInfo,
  getItem,
  getSkin,
  getSkinFromSkinUuid,
  getWeapon,
  getPrice,
  getRarity,
  getAllSkins,
  searchSkin,
  getBundle,
  getAllBundles,
  searchBundle,
  getBuddy,
  getSpray,
  getCard,
  getTitle,
  getBattlepassInfo,
  authFailureMessage,
  skinChosenEmbed,
  renderOffers,
  renderAccessoryOffers,
  getSkinLevels,
  renderBundles,
  renderBundle,
  renderNightMarket,
  renderBattlepass,
  renderBundleItems,
  bundleItemEmbed,
  skinEmbed,
  buddyEmbed,
  cardEmbed,
  sprayEmbed,
  titleEmbed,
  skinCollectionSingleEmbed,
  skinCollectionPageEmbed,
  collectionSwitchEmbedButton,
  collectionOfWeaponEmbed,
  botInfoEmbed,
  competitiveMatchEmbed,
  renderCompetitiveMatchHistory,
  renderProfile,
  profileButtons,
  ownerMessageEmbed,
  priceDescription,
  pageButtons,
  switchAccountButtons,
  alertFieldDescription,
  alertsPageEmbed,
  alertTestResponse,
  allStatsEmbed,
  statsForSkinEmbed,
  accountsListEmbed,
  settingsEmbed,
  valMaintenancesEmbeds,
  valMaintenanceEmbed,
  basicEmbed,
  headerEmbed,
  secondaryEmbed,
  createProgressBar,
  VAL_COLOR_1,
  VAL_COLOR_2,
  VAL_COLOR_3,
  thumbnails,
  discToValLang,
  valToDiscLang,
  discLanguageNames,
  DEFAULT_LANG,
  DEFAULT_VALORANT_LANG,
  s,
  l,
  hideUsername,
  useMultiqueue,
  sendMQRequest,
  sendMQResponse,
  handleMQRequest,
  handleMQResponse,
  mqGetShop,
  mqLoginUsernamePass,
  mqLogin2fa,
  mqLoginCookies,
  mqNullOperation,
  mqGetAuthQueueItemStatus,
  checkRateLimit,
  isRateLimited,
  settings,
  defaultSettings,
  getSettings,
  getSetting,
  setSetting,
  registerInteractionLocale,
  handleSettingsViewCommand,
  handleSettingsSetCommand,
  handleSettingDropdown,
  settingName,
  settingIsVisible,
  humanifyValue,
  computerifyValue,
  getShop,
  addShopCache,
  getShopCache,
  getBundles,
  getNightMarket,
  getBalance,
  getOffers,
  fetchShop,
  isThereANM,
  fetchBundles,
  fetchNightMarket,
  loadStats,
  getOverallStats,
  getStatsFor,
  addStore,
};
