const hive = require("@hiveio/hive-js");
const { buildDelegatorPool } = require("./src/tiers");
const fs = require("fs");

// Configure Hive API
hive.api.setOptions({ url: "https://api.hive.blog" });

// Target account (the account receiving delegations)
const ACCOUNT = "bayanihive"; // keep this in quotes

// Reward configuration
const TIER1_REWARD = 1.000; // HIVE amount for Tier 1 winners (10-94 HP)
const TIER2_REWARD = 3.000; // HIVE amount for Tier 2 winners (95+ HP)
const IS_DRY_RUN = process.env.DRY_RUN === true; // Set to true for testing

// Function to convert VESTS to HP
function vestsToHP(vests, totalVestingFundHive, totalVestingShares) {
  return (vests * totalVestingFundHive) / totalVestingShares;
}

// Function to send reward to winner
async function sendReward(to, amount, memo) {
  const fromAccount = process.env.HIVE_USER;
  const activeKey = process.env.HIVE_KEY;
  
  if (!fromAccount || !activeKey) {
    console.log(`⚠️ Missing HIVE_USER or HIVE_KEY environment variables. Cannot send reward.`);
    return false;
  }
  
  if (IS_DRY_RUN) {
    console.log(`🧪 DRY-RUN: Would send ${amount.toFixed(3)} HIVE from @${fromAccount} to @${to}`);
    console.log(`🧪 Memo: ${memo}`);
    return true;
  }
  
  try {
    return new Promise((resolve, reject) => {
      hive.broadcast.transfer(
        activeKey,
        fromAccount,
        to,
        `${amount.toFixed(3)} HIVE`,
        memo,
        (err, result) => {
          if (err) {
            console.error(`❌ Failed to send reward to @${to}:`, err.message);
            reject(err);
          } else {
            console.log(`✅ Sent ${amount.toFixed(3)} HIVE to @${to}`);
            console.log(`📝 Transaction ID: ${result.id}`);
            resolve(result);
          }
        }
      );
    });
  } catch (error) {
    console.error(`❌ Error sending reward to @${to}:`, error);
    return false;
  }
}

// Fetch delegators and run roulette
async function main() {
  console.log("Fetching delegators for @" + ACCOUNT + "...");

  // Check if the account exists
  try {
    const accountInfo = await hive.api.getAccountsAsync([ACCOUNT]);
    if (!accountInfo || accountInfo.length === 0) {
      console.error("Account @" + ACCOUNT + " not found!");
      return;
    }
    console.log("Account found:", accountInfo[0].name);
  } catch (error) {
    console.error("Error checking account:", error);
    return;
  }

  console.log("Loading delegation history...");

  try {
    // Check if delegation history file exists
    const delegationHistoryFile = 'delegation_history.json';
    if (!fs.existsSync(delegationHistoryFile)) {
      console.error(`❌ ${delegationHistoryFile} not found. Please run generate_delegation_history.js first.`);
      return;
    }

    // Load delegation history
    const delegationHistory = JSON.parse(fs.readFileSync(delegationHistoryFile));
    
    if (Object.keys(delegationHistory).length === 0) {
      console.log("No delegations found in history");
      return;
    }

    console.log(`Found ${Object.keys(delegationHistory).length} delegators in history`);

    // Get dynamic properties to convert VESTS to HP
    const props = await new Promise((resolve, reject) => {
      hive.api.getDynamicGlobalProperties((err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    const totalVestingShares = parseFloat(props.total_vesting_shares);
    const totalVestingFundHive = parseFloat(props.total_vesting_fund_hive);

    // Convert delegation history to current delegators
    const delegators = [];
    
    for (const [delegator, events] of Object.entries(delegationHistory)) {
      // Calculate current delegation amount (sum of all delegation events)
      const currentDelegation = events.reduce((sum, event) => sum + event.vests, 0);
      
      if (currentDelegation > 0) {
        const hp = vestsToHP(currentDelegation, totalVestingFundHive, totalVestingShares);
        delegators.push({
          username: delegator,
          hp: hp
        });
        
        console.log(`@${delegator}: ${currentDelegation.toFixed(6)} VESTS (~${hp.toFixed(3)} HP)`);
      }
    }

    if (delegators.length === 0) {
      console.log("No active delegators found!");
      return;
    }

    console.log(`\nTotal active delegators: ${delegators.length}`);

    // Separate delegators into two tiers
    const tier1Delegators = delegators.filter(d => d.hp >= 10 && d.hp < 95);
    const tier2Delegators = delegators.filter(d => d.hp >= 95);

    console.log(`\n📊 Tier Distribution:`);
    console.log(`Tier 1 (10-94 HP): ${tier1Delegators.length} delegators`);
    console.log(`Tier 2 (95+ HP): ${tier2Delegators.length} delegators`);

    // Build roulette pools for each tier
    const tier1Pool = buildDelegatorPool(tier1Delegators);
    const tier2Pool = buildDelegatorPool(tier2Delegators);

    console.log(`\n🎯 Tier 1 Pool: ${tier1Pool.length} entries`);
    console.log(`🎯 Tier 2 Pool: ${tier2Pool.length} entries`);

    if (tier1Pool.length === 0 && tier2Pool.length === 0) {
      console.log("No eligible delegators found in either tier!");
      return;
    }

    // Select winners from each tier
    let tier1Winner = null;
    let tier2Winner = null;

    if (tier1Pool.length > 0) {
      tier1Winner = tier1Pool[Math.floor(Math.random() * tier1Pool.length)];
      console.log(`\n🏆 Tier 1 Winner (10-94 HP): @${tier1Winner}!`);
    } else {
      console.log(`\n❌ No eligible delegators in Tier 1 (10-94 HP)`);
    }

    if (tier2Pool.length > 0) {
      tier2Winner = tier2Pool[Math.floor(Math.random() * tier2Pool.length)];
      console.log(`🏆 Tier 2 Winner (95+ HP): @${tier2Winner}!`);
    } else {
      console.log(`❌ No eligible delegators in Tier 2 (95+ HP)`);
    }

    // Send rewards to winners
    const currentDate = new Date().toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

    // Summary
    console.log(`\n🎉 Winners Summary:`);
    if (tier1Winner) console.log(`  Tier 1 (10-94 HP): @${tier1Winner} - ${TIER1_REWARD} HIVE sent to @steembasicincome`);
    if (tier2Winner) console.log(`  Tier 2 (95+ HP): @${tier2Winner} - ${TIER2_REWARD} HIVE sent to @steembasicincome`);
    
    if (IS_DRY_RUN) {
      console.log(`\n🧪 DRY RUN MODE: No actual transactions were sent`);
    }
    
  } catch (err) {
    console.error("Error processing delegations:", err);
  }
}

main();
