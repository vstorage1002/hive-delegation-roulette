// hive-delegation-roulette.js
const hive = require("@hiveio/hive-js");
const { buildDelegatorPool } = require("./src/tiers");
const fs = require("fs");

// 🔧 Hive API Nodes for Failover
const hiveNodes = [
  "https://api.hive.blog",
  "https://api.openhive.network",
  "https://anyx.io",
  "https://rpc.ecency.com",
  "https://techcoderx.com",
];

let currentNodeIndex = 0;
function setNextNode() {
  currentNodeIndex = (currentNodeIndex + 1) % hiveNodes.length;
  hive.api.setOptions({ url: hiveNodes[currentNodeIndex] });
  console.log(`🔁 Switched to Hive node: ${hiveNodes[currentNodeIndex]}`);
}

// Initialize first node
hive.api.setOptions({ url: hiveNodes[currentNodeIndex] });

// 🎯 Configuration
const ACCOUNT = "bayanihive"; // Account receiving delegations
const TIER1_REWARD = 1.000; // HIVE amount for Tier 1 winners (10–94 HP)
const TIER2_REWARD = 3.000; // HIVE amount for Tier 2 winners (95+ HP)
const IS_DRY_RUN = process.env.DRY_RUN === "true"; // "true" = no real broadcast

// 🧮 Convert VESTS → HP
function vestsToHP(vests, totalVestingFundHive, totalVestingShares) {
  return (vests * totalVestingFundHive) / totalVestingShares;
}

// 💸 Send Reward with Retry + Failover
async function sendReward(to, amount, memo, retries = 3) {
  const fromAccount = process.env.HIVE_USER;
  const activeKey = process.env.HIVE_KEY;

  if (!fromAccount || !activeKey) {
    console.log("⚠️ Missing HIVE_USER or HIVE_KEY environment variables. Cannot send reward.");
    return false;
  }

  if (IS_DRY_RUN) {
    console.log(`🧪 DRY-RUN: Would send ${amount.toFixed(3)} HIVE from @${fromAccount} to @${to}`);
    console.log(`🧪 Memo: ${memo}`);
    return true;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await new Promise((resolve, reject) => {
        hive.broadcast.transfer(
          activeKey,
          fromAccount,
          to,
          `${amount.toFixed(3)} HIVE`,
          memo,
          (err, res) => {
            if (err) return reject(err);
            resolve(res);
          }
        );
      });
      console.log(`✅ Sent ${amount.toFixed(3)} HIVE to @${to}`);
      console.log(`📝 Transaction ID: ${result.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for @${to}: ${error.message}`);
      if (attempt < retries) {
        setNextNode();
        await new Promise((r) => setTimeout(r, 2000)); // Wait 2 seconds before retry
      }
    }
  }

  console.error(`🚨 All ${retries} attempts failed for @${to}.`);
  fs.appendFileSync("failed_payouts.log", `${new Date().toISOString()} | ${to} | ${amount} | ${memo}\n`);
  return false;
}

// 🌀 Main Function
async function main() {
  console.log(`Fetching delegators for @${ACCOUNT}...`);

  try {
    const accountInfo = await hive.api.getAccountsAsync([ACCOUNT]);
    if (!accountInfo || accountInfo.length === 0) {
      console.error(`❌ Account @${ACCOUNT} not found!`);
      return;
    }
    console.log(`✅ Account found: ${accountInfo[0].name}`);
  } catch (error) {
    console.error("❌ Error checking account:", error);
    return;
  }

  console.log("📜 Loading delegation history...");
  const delegationHistoryFile = "delegation_history.json";

  if (!fs.existsSync(delegationHistoryFile)) {
    console.error(`❌ ${delegationHistoryFile} not found. Please run generate_delegation_history.js first.`);
    return;
  }

  const delegationHistory = JSON.parse(fs.readFileSync(delegationHistoryFile));
  if (Object.keys(delegationHistory).length === 0) {
    console.log("No delegations found in history.");
    return;
  }

  console.log(`Found ${Object.keys(delegationHistory).length} delegators in history.`);

  // 🧮 Get Dynamic Properties (for HP conversion)
  const props = await new Promise((resolve, reject) => {
    hive.api.getDynamicGlobalProperties((err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });

  const totalVestingShares = parseFloat(props.total_vesting_shares);
  const totalVestingFundHive = parseFloat(props.total_vesting_fund_hive);

  // 🔍 Process Delegators
  const delegators = [];

  for (const [delegator, events] of Object.entries(delegationHistory)) {
    const currentDelegation = events.reduce((sum, event) => sum + event.vests, 0);

    if (currentDelegation > 0) {
      const hp = vestsToHP(currentDelegation, totalVestingFundHive, totalVestingShares);
      delegators.push({ username: delegator, hp: hp });
      console.log(`@${delegator}: ${currentDelegation.toFixed(6)} VESTS (~${hp.toFixed(3)} HP)`);
    }
  }

  if (delegators.length === 0) {
    console.log("No active delegators found!");
    return;
  }

  console.log(`\n📊 Total Active Delegators: ${delegators.length}`);
  const tier1Delegators = delegators.filter((d) => d.hp >= 10 && d.hp < 95);
  const tier2Delegators = delegators.filter((d) => d.hp >= 95);

  console.log(`\n📈 Tier Distribution:`);
  console.log(`Tier 1 (10–94 HP): ${tier1Delegators.length}`);
  console.log(`Tier 2 (95+ HP): ${tier2Delegators.length}`);

  // 🎰 Build Roulette Pools
  const tier1Pool = buildDelegatorPool(tier1Delegators);
  const tier2Pool = buildDelegatorPool(tier2Delegators);

  console.log(`\n🎯 Tier 1 Pool Entries: ${tier1Pool.length}`);
  console.log(`🎯 Tier 2 Pool Entries: ${tier2Pool.length}`);

  if (tier1Pool.length === 0 && tier2Pool.length === 0) {
    console.log("❌ No eligible delegators found in either tier.");
    return;
  }

  // 🏆 Select Winners
  let tier1Winner = tier1Pool.length > 0 ? tier1Pool[Math.floor(Math.random() * tier1Pool.length)] : null;
  let tier2Winner = tier2Pool.length > 0 ? tier2Pool[Math.floor(Math.random() * tier2Pool.length)] : null;

  if (tier1Winner) console.log(`\n🏆 Tier 1 Winner: @${tier1Winner}`);
  if (tier2Winner) console.log(`🏆 Tier 2 Winner: @${tier2Winner}`);

  // 💰 Send Rewards
  const currentDate = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (tier1Winner) {
    const memo = `@vinzie1:@${tier1Winner}`;
    console.log(`\n💰 Sending ${TIER1_REWARD} HIVE reward to @steembasicincome (Tier 1 winner: @${tier1Winner})...`);
    await sendReward("steembasicincome", TIER1_REWARD, memo);
  }

  if (tier2Winner) {
    const memo = `@vinzie1:@${tier2Winner}`;
    console.log(`\n💰 Sending ${TIER2_REWARD} HIVE reward to @steembasicincome (Tier 2 winner: @${tier2Winner})...`);
    await sendReward("steembasicincome", TIER2_REWARD, memo);
  }

  // 📋 Summary
  console.log(`\n🎉 Winners Summary:`);
  if (tier1Winner) console.log(`  Tier 1: @${tier1Winner} - ${TIER1_REWARD} HIVE sent to @steembasicincome`);
  if (tier2Winner) console.log(`  Tier 2: @${tier2Winner} - ${TIER2_REWARD} HIVE sent to @steembasicincome`);

  if (IS_DRY_RUN) {
    console.log(`\n🧪 DRY RUN MODE: No actual transactions were sent.`);
  }
}

// 🚀 Run Script
main().catch((err) => {
  console.error("Unhandled error:", err);
});
